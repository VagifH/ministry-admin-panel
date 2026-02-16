from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'ministry-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: Literal["Admin", "Editor", "Approver"]
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Literal["Admin", "Editor", "Approver"]
    is_active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["Admin", "Editor", "Approver"]] = None
    is_active: Optional[bool] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content_type: Literal["Announcement", "Short Lesson", "Full Lesson"]
    avatar: Literal["Avatar 1", "Avatar 2", "Avatar 3"]
    script: str
    notes: Optional[str] = None
    publish_datetime: datetime
    status: Literal["Draft", "Submitted", "Producing", "Review", "Scheduled", "Published", "Rejected"]
    owner: str  # user id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('script')
    @classmethod
    def validate_script(cls, v):
        if len(v) < 20:
            raise ValueError('Script must be at least 20 characters long')
        return v

class TaskCreate(BaseModel):
    title: str
    content_type: Literal["Announcement", "Short Lesson", "Full Lesson"]
    avatar: Literal["Avatar 1", "Avatar 2", "Avatar 3"]
    script: str
    notes: Optional[str] = None
    publish_datetime: datetime

    @field_validator('script')
    @classmethod
    def validate_script(cls, v):
        if len(v) < 20:
            raise ValueError('Script must be at least 20 characters long')
        return v

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    content_type: Optional[Literal["Announcement", "Short Lesson", "Full Lesson"]] = None
    avatar: Optional[Literal["Avatar 1", "Avatar 2", "Avatar 3"]] = None
    script: Optional[str] = None
    notes: Optional[str] = None
    publish_datetime: Optional[datetime] = None
    owner: Optional[str] = None

    @field_validator('script')
    @classmethod
    def validate_script(cls, v):
        if v and len(v) < 20:
            raise ValueError('Script must be at least 20 characters long')
        return v

class StatusChange(BaseModel):
    status: Literal["Draft", "Submitted", "Producing", "Review", "Scheduled", "Published", "Rejected"]

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    task_id: str
    author_id: str
    author_name: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    message: str

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    actor_id: str
    actor_name: str
    action: str
    object_type: str
    object_id: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class DashboardStats(BaseModel):
    draft: int
    submitted: int
    producing: int
    review: int
    scheduled: int
    published: int
    rejected: int
    scheduled_this_week: int

# ==================== UTILITIES ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

async def log_audit(actor_id: str, actor_name: str, action: str, object_type: str, object_id: str, old_value: Optional[str] = None, new_value: Optional[str] = None):
    import uuid
    log = {
        "id": str(uuid.uuid4()),
        "actor_id": actor_id,
        "actor_name": actor_name,
        "action": action,
        "object_type": object_type,
        "object_id": object_id,
        "old_value": old_value,
        "new_value": new_value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log)

STATUS_TRANSITIONS = {
    "Draft": ["Submitted"],
    "Submitted": ["Producing"],
    "Producing": ["Review"],
    "Review": ["Scheduled", "Rejected"],
    "Rejected": ["Draft"],
    "Scheduled": ["Published"],
    "Published": []
}

def can_transition(from_status: str, to_status: str, is_admin: bool) -> bool:
    if is_admin:
        return True  # Admin can change any status
    return to_status in STATUS_TRANSITIONS.get(from_status, [])

# ==================== STARTUP ====================

@app.on_event("startup")
async def create_default_admin():
    admin_exists = await db.users.find_one({"email": "admin@ministry.local"})
    if not admin_exists:
        import uuid
        admin = {
            "id": str(uuid.uuid4()),
            "name": "System Admin",
            "email": "admin@ministry.local",
            "hashed_password": hash_password("ChangeMe123!"),
            "role": "Admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin)
        logger.info("Default admin user created")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc or not verify_password(request.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc["is_active"]:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    token = create_access_token({"sub": user_doc["id"]})
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    return LoginResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== USER ENDPOINTS ====================

@api_router.get("/users", response_model=List[User])
async def list_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(100)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    import uuid
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    user_dict["id"] = str(uuid.uuid4())
    user_dict["hashed_password"] = hash_password(password)
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    await log_audit(current_user.id, current_user.name, "CREATE", "User", user_dict["id"], None, user_data.email)
    
    user_dict.pop("hashed_password")
    user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    return User(**user_dict)

@api_router.patch("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
        await log_audit(current_user.id, current_user.name, "UPDATE", "User", user_id, None, str(update_dict))
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return User(**updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_audit(current_user.id, current_user.name, "DELETE", "User", user_id, None, None)
    return {"message": "User deleted"}

# ==================== TASK ENDPOINTS ====================

@api_router.get("/tasks", response_model=List[Task])
async def list_tasks(
    search: Optional[str] = None,
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    avatar: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"script": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    if content_type:
        query["content_type"] = content_type
    if avatar:
        query["avatar"] = avatar
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        if date_query:
            query["publish_datetime"] = date_query
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    for t in tasks:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        if isinstance(t.get('updated_at'), str):
            t['updated_at'] = datetime.fromisoformat(t['updated_at'])
        if isinstance(t.get('publish_datetime'), str):
            t['publish_datetime'] = datetime.fromisoformat(t['publish_datetime'])
    return tasks

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if isinstance(task.get('created_at'), str):
        task['created_at'] = datetime.fromisoformat(task['created_at'])
    if isinstance(task.get('updated_at'), str):
        task['updated_at'] = datetime.fromisoformat(task['updated_at'])
    if isinstance(task.get('publish_datetime'), str):
        task['publish_datetime'] = datetime.fromisoformat(task['publish_datetime'])
    
    return Task(**task)

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "Approver":
        raise HTTPException(status_code=403, detail="Approvers cannot create tasks")
    
    import uuid
    task_dict = task_data.model_dump()
    task_dict["id"] = str(uuid.uuid4())
    task_dict["status"] = "Draft"
    task_dict["owner"] = current_user.id
    task_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    task_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    task_dict["publish_datetime"] = task_dict["publish_datetime"].isoformat()
    
    await db.tasks.insert_one(task_dict)
    await log_audit(current_user.id, current_user.name, "CREATE", "Task", task_dict["id"], None, task_data.title)
    
    task_dict['created_at'] = datetime.fromisoformat(task_dict['created_at'])
    task_dict['updated_at'] = datetime.fromisoformat(task_dict['updated_at'])
    task_dict['publish_datetime'] = datetime.fromisoformat(task_dict['publish_datetime'])
    return Task(**task_dict)

@api_router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, current_user: User = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Permission checks
    if current_user.role == "Approver":
        raise HTTPException(status_code=403, detail="Approvers cannot edit task fields")
    
    if current_user.role == "Editor" and existing["status"] in ["Scheduled", "Published"]:
        raise HTTPException(status_code=403, detail="Cannot edit tasks that are Scheduled or Published")
    
    update_dict = {k: v for k, v in task_data.model_dump().items() if v is not None}
    if update_dict:
        if "publish_datetime" in update_dict:
            update_dict["publish_datetime"] = update_dict["publish_datetime"].isoformat()
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.tasks.update_one({"id": task_id}, {"$set": update_dict})
        await log_audit(current_user.id, current_user.name, "UPDATE", "Task", task_id, None, str(update_dict))
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    if isinstance(updated.get('publish_datetime'), str):
        updated['publish_datetime'] = datetime.fromisoformat(updated['publish_datetime'])
    
    return Task(**updated)

@api_router.patch("/tasks/{task_id}/status", response_model=Task)
async def change_task_status(task_id: str, status_change: StatusChange, current_user: User = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    old_status = existing["status"]
    new_status = status_change.status
    
    # Permission checks
    if current_user.role == "Editor":
        if new_status not in ["Submitted"] and old_status == "Draft":
            raise HTTPException(status_code=403, detail="Editors can only submit (Draft -> Submitted)")
        if old_status != "Draft":
            raise HTTPException(status_code=403, detail="Editors can only change status from Draft")
    
    if current_user.role == "Approver":
        if old_status != "Review":
            raise HTTPException(status_code=403, detail="Approvers can only change status from Review")
        if new_status not in ["Scheduled", "Rejected"]:
            raise HTTPException(status_code=403, detail="Approvers can only approve (Scheduled) or reject")
    
    # Validate transition
    if not can_transition(old_status, new_status, current_user.role == "Admin"):
        raise HTTPException(status_code=400, detail=f"Invalid status transition: {old_status} -> {new_status}")
    
    # Check video requirement for Published
    if new_status == "Published":
        # Placeholder check - in Phase 2, check if video exists
        pass
    
    update_dict = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_dict})
    await log_audit(current_user.id, current_user.name, "STATUS_CHANGE", "Task", task_id, old_status, new_status)
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    if isinstance(updated.get('publish_datetime'), str):
        updated['publish_datetime'] = datetime.fromisoformat(updated['publish_datetime'])
    
    return Task(**updated)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete tasks")
    
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await log_audit(current_user.id, current_user.name, "DELETE", "Task", task_id, None, None)
    return {"message": "Task deleted"}

# ==================== COMMENT ENDPOINTS ====================

@api_router.get("/tasks/{task_id}/comments", response_model=List[Comment])
async def list_comments(task_id: str, current_user: User = Depends(get_current_user)):
    comments = await db.comments.find({"task_id": task_id}, {"_id": 0}).to_list(1000)
    for c in comments:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return comments

@api_router.post("/tasks/{task_id}/comments", response_model=Comment)
async def create_comment(task_id: str, comment_data: CommentCreate, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    import uuid
    comment_dict = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "author_id": current_user.id,
        "author_name": current_user.name,
        "message": comment_data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(comment_dict)
    await log_audit(current_user.id, current_user.name, "COMMENT", "Task", task_id, None, comment_data.message[:50])
    
    comment_dict['created_at'] = datetime.fromisoformat(comment_dict['created_at'])
    return Comment(**comment_dict)

# ==================== AUDIT LOG ENDPOINTS ====================

@api_router.get("/audit-logs", response_model=List[AuditLog])
async def list_audit_logs(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if actor_id:
        query["actor_id"] = actor_id
    if action:
        query["action"] = action
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        if date_query:
            query["created_at"] = date_query
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for log in logs:
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    from datetime import timedelta
    
    # Count by status
    draft = await db.tasks.count_documents({"status": "Draft"})
    submitted = await db.tasks.count_documents({"status": "Submitted"})
    producing = await db.tasks.count_documents({"status": "Producing"})
    review = await db.tasks.count_documents({"status": "Review"})
    scheduled = await db.tasks.count_documents({"status": "Scheduled"})
    published = await db.tasks.count_documents({"status": "Published"})
    rejected = await db.tasks.count_documents({"status": "Rejected"})
    
    # Scheduled this week
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=7)
    
    scheduled_this_week = await db.tasks.count_documents({
        "status": "Scheduled",
        "publish_datetime": {
            "$gte": week_start.isoformat(),
            "$lt": week_end.isoformat()
        }
    })
    
    return DashboardStats(
        draft=draft,
        submitted=submitted,
        producing=producing,
        review=review,
        scheduled=scheduled,
        published=published,
        rejected=rejected,
        scheduled_this_week=scheduled_this_week
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
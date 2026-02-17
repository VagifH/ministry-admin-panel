from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import shutil
import aiofiles
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

# Video Upload Configuration
VIDEO_UPLOAD_DIR = ROOT_DIR / "uploads" / "videos"
VIDEO_MAX_SIZE_MB = 200
VIDEO_MAX_SIZE_BYTES = VIDEO_MAX_SIZE_MB * 1024 * 1024  # 200MB
ALLOWED_VIDEO_TYPES = ["video/mp4"]

# Avatar Upload Configuration
AVATAR_UPLOAD_DIR = ROOT_DIR / "uploads" / "avatars"
AVATAR_MAX_SIZE_MB = 2
AVATAR_MAX_SIZE_BYTES = AVATAR_MAX_SIZE_MB * 1024 * 1024  # 2MB
ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]

# Status Configuration
VALID_STATUSES = ["Draft", "Submitted", "InProgress", "ReadyForReview", "ChangesRequested", "Approved", "Rejected", "Scheduled", "Published"]

# Migration mapping for old statuses
STATUS_MIGRATION_MAP = {
    "Producing": "InProgress",
    "Review": "ReadyForReview"
}

def migrate_status(status: str) -> str:
    """Migrate old status values to new ones"""
    return STATUS_MIGRATION_MAP.get(status, status)

def migrate_task_status(task: dict) -> dict:
    """Migrate task status if needed"""
    if task and 'status' in task:
        task['status'] = migrate_status(task['status'])
    return task

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
    status: Literal["Draft", "Submitted", "InProgress", "ReadyForReview", "ChangesRequested", "Approved", "Rejected", "Scheduled", "Published"]
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
    status: Literal["Draft", "Submitted", "InProgress", "ReadyForReview", "ChangesRequested", "Approved", "Rejected", "Scheduled", "Published"]

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

# ==================== VIDEO MODELS ====================

class Video(BaseModel):
    """Video metadata model - stores information about uploaded videos for tasks"""
    model_config = ConfigDict(extra="ignore")
    id: str
    task_id: str
    filename: Optional[str] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None  # bytes
    mime_type: Optional[str] = None
    duration: Optional[float] = None  # seconds
    status: Literal["pending", "uploading", "processing", "ready", "failed"] = "pending"
    error_message: Optional[str] = None
    storage_provider: Optional[str] = None  # "local", "s3", "gcs", etc.
    storage_key: Optional[str] = None  # relative path or object key
    uploaded_by: str  # user id
    uploaded_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VideoCreate(BaseModel):
    """Request model for initiating a video upload"""
    task_id: str
    original_filename: str
    file_size: int
    mime_type: str

class VideoUpdate(BaseModel):
    """Request model for updating video metadata"""
    status: Optional[Literal["pending", "uploading", "processing", "ready", "failed"]] = None
    filename: Optional[str] = None
    duration: Optional[float] = None
    error_message: Optional[str] = None

class VideoResponse(BaseModel):
    """Response model for video operations"""
    id: str
    task_id: str
    filename: Optional[str] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duration: Optional[float] = None
    status: str
    error_message: Optional[str] = None
    storage_provider: Optional[str] = None
    storage_key: Optional[str] = None
    uploaded_by: str
    uploaded_by_name: str
    created_at: datetime
    updated_at: datetime

# ==================== AVATAR MODELS ====================

class AvatarResponse(BaseModel):
    """Response model for avatar data"""
    id: str
    name: str
    has_photo: bool
    photo_data: Optional[str] = None  # base64 encoded image
    updated_at: Optional[datetime] = None

# Default avatars configuration
DEFAULT_AVATARS = [
    {"id": "avatar-1", "name": "Avatar 1"},
    {"id": "avatar-2", "name": "Avatar 2"},
    {"id": "avatar-3", "name": "Avatar 3"},
]

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: User

class DashboardStats(BaseModel):
    draft: int
    submitted: int
    in_progress: int
    ready_for_review: int
    changes_requested: int
    approved: int
    rejected: int
    scheduled: int
    published: int
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

@app.on_event("startup")
async def seed_default_avatars():
    """Seed the 3 fixed avatars if they don't exist"""
    for avatar in DEFAULT_AVATARS:
        existing = await db.avatars.find_one({"id": avatar["id"]})
        if not existing:
            avatar_doc = {
                "id": avatar["id"],
                "name": avatar["name"],
                "has_photo": False,
                "photo_data": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.avatars.insert_one(avatar_doc)
            logger.info(f"Seeded avatar: {avatar['name']}")

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
        # Migrate old status to new status
        t['status'] = migrate_status(t.get('status', 'Draft'))
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
    
    # Migrate old status to new status
    task['status'] = migrate_status(task.get('status', 'Draft'))
    
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
    
    # Count by status (including migration from old statuses)
    draft = await db.tasks.count_documents({"status": "Draft"})
    submitted = await db.tasks.count_documents({"status": "Submitted"})
    # Count both old and new status names
    in_progress = await db.tasks.count_documents({"status": {"$in": ["InProgress", "Producing"]}})
    ready_for_review = await db.tasks.count_documents({"status": {"$in": ["ReadyForReview", "Review"]}})
    changes_requested = await db.tasks.count_documents({"status": "ChangesRequested"})
    approved = await db.tasks.count_documents({"status": "Approved"})
    rejected = await db.tasks.count_documents({"status": "Rejected"})
    scheduled = await db.tasks.count_documents({"status": "Scheduled"})
    published = await db.tasks.count_documents({"status": "Published"})
    
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
        in_progress=in_progress,
        ready_for_review=ready_for_review,
        changes_requested=changes_requested,
        approved=approved,
        rejected=rejected,
        scheduled=scheduled,
        published=published,
        scheduled_this_week=scheduled_this_week
    )

# ==================== VIDEO ENDPOINTS ====================

@api_router.get("/tasks/{task_id}/video", response_model=Optional[VideoResponse])
async def get_task_video(task_id: str, current_user: User = Depends(get_current_user)):
    """Get video metadata for a specific task"""
    # Verify task exists
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Find video for this task
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        return None
    
    # Convert datetime strings if needed
    if isinstance(video.get('created_at'), str):
        video['created_at'] = datetime.fromisoformat(video['created_at'])
    if isinstance(video.get('updated_at'), str):
        video['updated_at'] = datetime.fromisoformat(video['updated_at'])
    
    return VideoResponse(**video)

@api_router.post("/tasks/{task_id}/video", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def create_video_record(task_id: str, video_data: VideoCreate, current_user: User = Depends(get_current_user)):
    """Initialize a video record for a task (preparation for upload)"""
    import uuid
    
    # Verify task exists
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if video already exists for this task
    existing_video = await db.videos.find_one({"task_id": task_id})
    if existing_video:
        raise HTTPException(status_code=400, detail="Video already exists for this task. Delete it first to upload a new one.")
    
    # Check permissions - Admins and Editors can upload videos
    if current_user.role not in ["Admin", "Editor"]:
        raise HTTPException(status_code=403, detail="Only Admin and Editor roles can upload videos")
    
    # Check task status - cannot upload to Published tasks
    if task.get("status") == "Published":
        raise HTTPException(status_code=400, detail="Cannot upload video to a published task")
    
    now = datetime.now(timezone.utc)
    video_dict = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "original_filename": video_data.original_filename,
        "file_size": video_data.file_size,
        "mime_type": video_data.mime_type,
        "status": "pending",
        "uploaded_by": current_user.id,
        "uploaded_by_name": current_user.name,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.videos.insert_one(video_dict)
    await log_audit(current_user.id, current_user.name, "CREATE", "Video", video_dict["id"], None, video_data.original_filename)
    
    video_dict['created_at'] = now
    video_dict['updated_at'] = now
    
    return VideoResponse(**video_dict)

@api_router.patch("/tasks/{task_id}/video", response_model=VideoResponse)
async def update_video_status(task_id: str, video_update: VideoUpdate, current_user: User = Depends(get_current_user)):
    """Update video metadata (status, duration, etc.)"""
    # Find existing video
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found for this task")
    
    # Build update dict
    update_data = video_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track old status for audit
    old_status = video.get("status")
    new_status = update_data.get("status", old_status)
    
    await db.videos.update_one({"task_id": task_id}, {"$set": update_data})
    
    if old_status != new_status:
        await log_audit(current_user.id, current_user.name, "STATUS_CHANGE", "Video", video["id"], old_status, new_status)
    
    # Fetch updated video
    updated_video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if isinstance(updated_video.get('created_at'), str):
        updated_video['created_at'] = datetime.fromisoformat(updated_video['created_at'])
    if isinstance(updated_video.get('updated_at'), str):
        updated_video['updated_at'] = datetime.fromisoformat(updated_video['updated_at'])
    
    return VideoResponse(**updated_video)

@api_router.delete("/tasks/{task_id}/video", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(task_id: str, current_user: User = Depends(get_current_user)):
    """Delete video record and file for a task"""
    # Find existing video
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found for this task")
    
    # Check permissions
    if current_user.role not in ["Admin", "Editor"]:
        raise HTTPException(status_code=403, detail="Only Admin and Editor roles can delete videos")
    
    # Verify task isn't published
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if task and task.get("status") == "Published":
        raise HTTPException(status_code=400, detail="Cannot delete video from a published task")
    
    # Delete the actual file if it exists
    if video.get("storage_provider") == "local" and video.get("storage_key"):
        file_path = VIDEO_UPLOAD_DIR / video["storage_key"]
        if file_path.exists():
            file_path.unlink()
        # Also try to remove the task directory if empty
        task_dir = VIDEO_UPLOAD_DIR / task_id
        if task_dir.exists() and not any(task_dir.iterdir()):
            task_dir.rmdir()
    
    await db.videos.delete_one({"task_id": task_id})
    await log_audit(current_user.id, current_user.name, "DELETE", "Video", video["id"], video.get("original_filename"), None)
    
    return None

@api_router.get("/tasks/{task_id}/video/status")
async def get_video_status(task_id: str, current_user: User = Depends(get_current_user)):
    """Get just the video status for a task (lightweight endpoint)"""
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0, "status": 1, "error_message": 1})
    if not video:
        return {"has_video": False, "status": None, "error_message": None}
    
    return {
        "has_video": True,
        "status": video.get("status"),
        "error_message": video.get("error_message")
    }

@api_router.post("/tasks/{task_id}/video/upload", response_model=VideoResponse)
async def upload_video(task_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload a video file for a task"""
    import uuid
    
    # Check permissions - Admins and Editors can upload videos
    if current_user.role not in ["Admin", "Editor"]:
        raise HTTPException(status_code=403, detail="Only Admin and Editor roles can upload videos")
    
    # Verify task exists
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check task status - cannot upload to Published tasks
    if task.get("status") == "Published":
        raise HTTPException(status_code=400, detail="Cannot upload video to a published task")
    
    # Validate file type
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Only {', '.join(ALLOWED_VIDEO_TYPES)} allowed. Got: {file.content_type}"
        )
    
    # Read file to check size (and for writing)
    contents = await file.read()
    file_size = len(contents)
    
    # Validate file size
    if file_size > VIDEO_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size is {VIDEO_MAX_SIZE_MB}MB. Got: {file_size / (1024*1024):.1f}MB"
        )
    
    # Check if video already exists - if so, delete old file first
    existing_video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if existing_video:
        # Delete old file if exists
        if existing_video.get("storage_provider") == "local" and existing_video.get("storage_key"):
            old_file_path = VIDEO_UPLOAD_DIR / existing_video["storage_key"]
            if old_file_path.exists():
                old_file_path.unlink()
        # Delete old record
        await db.videos.delete_one({"task_id": task_id})
    
    # Create directory structure
    task_dir = VIDEO_UPLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    video_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix.lower() or ".mp4"
    stored_filename = f"{video_id}{file_extension}"
    storage_key = f"{task_id}/{stored_filename}"
    file_path = VIDEO_UPLOAD_DIR / storage_key
    
    try:
        # Write file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(contents)
        
        # Create video record
        now = datetime.now(timezone.utc)
        video_dict = {
            "id": video_id,
            "task_id": task_id,
            "filename": stored_filename,
            "original_filename": file.filename,
            "file_size": file_size,
            "mime_type": file.content_type,
            "status": "ready",
            "storage_provider": "local",
            "storage_key": storage_key,
            "uploaded_by": current_user.id,
            "uploaded_by_name": current_user.name,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.videos.insert_one(video_dict)
        await log_audit(current_user.id, current_user.name, "UPLOAD", "Video", video_id, None, file.filename)
        
        video_dict['created_at'] = now
        video_dict['updated_at'] = now
        
        return VideoResponse(**video_dict)
        
    except Exception as e:
        # Clean up file if it was written
        if file_path.exists():
            file_path.unlink()
        
        # Create failed video record for tracking
        now = datetime.now(timezone.utc)
        video_dict = {
            "id": video_id,
            "task_id": task_id,
            "original_filename": file.filename,
            "file_size": file_size,
            "mime_type": file.content_type,
            "status": "failed",
            "error_message": str(e),
            "uploaded_by": current_user.id,
            "uploaded_by_name": current_user.name,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.videos.insert_one(video_dict)
        await log_audit(current_user.id, current_user.name, "UPLOAD_FAILED", "Video", video_id, None, str(e))
        
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

@api_router.get("/tasks/{task_id}/video/download")
async def download_video(task_id: str, current_user: User = Depends(get_current_user)):
    """Download video file for a task"""
    # All authenticated roles can download (Admin, Editor, Approver)
    
    # Find video record
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="No video found for this task")
    
    # Check video status
    if video.get("status") != "ready":
        raise HTTPException(
            status_code=409, 
            detail=f"Video is not ready for download. Current status: {video.get('status')}"
        )
    
    # Check storage provider and get file path
    if video.get("storage_provider") != "local":
        raise HTTPException(status_code=501, detail="Only local storage downloads are supported")
    
    storage_key = video.get("storage_key")
    if not storage_key:
        raise HTTPException(status_code=404, detail="Video file path not found")
    
    file_path = VIDEO_UPLOAD_DIR / storage_key
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on server")
    
    # Get original filename for download
    original_filename = video.get("original_filename", "video.mp4")
    
    return FileResponse(
        path=str(file_path),
        filename=original_filename,
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{original_filename}"'
        }
    )

@api_router.get("/tasks/{task_id}/video/stream")
async def stream_video(
    task_id: str, 
    current_user: User = Depends(get_current_user),
    range: Optional[str] = Header(None)
):
    """Stream video file with Range support for in-browser preview"""
    # All authenticated roles can stream (Admin, Editor, Approver)
    
    # Find video record
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="No video found for this task")
    
    # Check video status
    if video.get("status") != "ready":
        raise HTTPException(
            status_code=409, 
            detail=f"Video is not ready for streaming. Current status: {video.get('status')}"
        )
    
    # Check storage provider and get file path
    if video.get("storage_provider") != "local":
        raise HTTPException(status_code=501, detail="Only local storage streaming is supported")
    
    storage_key = video.get("storage_key")
    if not storage_key:
        raise HTTPException(status_code=404, detail="Video file path not found")
    
    file_path = VIDEO_UPLOAD_DIR / storage_key
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on server")
    
    file_size = file_path.stat().st_size
    
    # Parse Range header if present
    start = 0
    end = file_size - 1
    
    if range:
        range_str = range.replace("bytes=", "")
        range_parts = range_str.split("-")
        start = int(range_parts[0]) if range_parts[0] else 0
        end = int(range_parts[1]) if range_parts[1] else file_size - 1
    
    # Ensure valid range
    if start >= file_size:
        raise HTTPException(status_code=416, detail="Range not satisfiable")
    
    end = min(end, file_size - 1)
    content_length = end - start + 1
    
    async def iterfile():
        async with aiofiles.open(file_path, mode='rb') as f:
            await f.seek(start)
            remaining = content_length
            chunk_size = 1024 * 1024  # 1MB chunks
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                data = await f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data
    
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "video/mp4"
    }
    
    status_code = 206 if range else 200
    
    return StreamingResponse(
        iterfile(),
        status_code=status_code,
        headers=headers,
        media_type="video/mp4"
    )

# ==================== AVATAR ENDPOINTS ====================

@api_router.get("/avatars", response_model=List[AvatarResponse])
async def list_avatars(current_user: User = Depends(get_current_user)):
    """Get all 3 fixed avatars with their photo data"""
    avatars = await db.avatars.find({}, {"_id": 0}).to_list(10)
    
    # Ensure all 3 avatars exist
    if len(avatars) < 3:
        # Re-seed missing avatars
        for default_avatar in DEFAULT_AVATARS:
            existing = await db.avatars.find_one({"id": default_avatar["id"]})
            if not existing:
                avatar_doc = {
                    "id": default_avatar["id"],
                    "name": default_avatar["name"],
                    "has_photo": False,
                    "photo_data": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.avatars.insert_one(avatar_doc)
        avatars = await db.avatars.find({}, {"_id": 0}).to_list(10)
    
    result = []
    for avatar in avatars:
        if isinstance(avatar.get('updated_at'), str):
            avatar['updated_at'] = datetime.fromisoformat(avatar['updated_at'])
        result.append(AvatarResponse(**avatar))
    
    return result

@api_router.post("/avatars/{avatar_id}/photo", response_model=AvatarResponse)
async def upload_avatar_photo(
    avatar_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a photo for an avatar (Admin only)"""
    import base64
    
    # Admin only
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can upload avatar photos")
    
    # Find avatar
    avatar = await db.avatars.find_one({"id": avatar_id}, {"_id": 0})
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only JPG, PNG, WebP allowed. Got: {file.content_type}"
        )
    
    # Read and validate file size
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > AVATAR_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {AVATAR_MAX_SIZE_MB}MB. Got: {file_size / (1024*1024):.1f}MB"
        )
    
    # Encode to base64
    photo_base64 = base64.b64encode(contents).decode('utf-8')
    
    # Create data URL with mime type prefix
    photo_data = f"data:{file.content_type};base64,{photo_base64}"
    
    # Update avatar
    update_data = {
        "has_photo": True,
        "photo_data": photo_data,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.avatars.update_one({"id": avatar_id}, {"$set": update_data})
    await log_audit(current_user.id, current_user.name, "UPLOAD", "Avatar", avatar_id, None, file.filename)
    
    # Return updated avatar
    updated = await db.avatars.find_one({"id": avatar_id}, {"_id": 0})
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return AvatarResponse(**updated)

@api_router.delete("/avatars/{avatar_id}/photo", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar_photo(
    avatar_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove photo from an avatar (Admin only)"""
    # Admin only
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete avatar photos")
    
    # Find avatar
    avatar = await db.avatars.find_one({"id": avatar_id}, {"_id": 0})
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    if not avatar.get("has_photo"):
        raise HTTPException(status_code=400, detail="Avatar has no photo to delete")
    
    # Update avatar
    update_data = {
        "has_photo": False,
        "photo_data": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.avatars.update_one({"id": avatar_id}, {"$set": update_data})
    await log_audit(current_user.id, current_user.name, "DELETE", "Avatar Photo", avatar_id, None, None)
    
    return None

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
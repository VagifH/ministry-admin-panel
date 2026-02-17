from fastapi import FastAPI, APIRouter, Depends, status, UploadFile, File, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import shutil
import aiofiles
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt
from PIL import Image

# Import storage service
from services.storage_service import storage_service

# Import audit logger
from services.audit_service import audit_logger, AuditAction, EntityType

# Import error handling
from services.error_service import (
    AppError, ValidationError, AuthError, ForbiddenError, 
    NotFoundError, ConflictError, ServerError, ErrorCode,
    app_error_handler, generic_exception_handler, validation_exception_handler,
    raise_not_found, raise_forbidden, raise_validation
)

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
VIDEO_MAX_SIZE_MB = 100  # Maximum upload size: 100MB
VIDEO_MAX_SIZE_BYTES = VIDEO_MAX_SIZE_MB * 1024 * 1024  # 100MB
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"]

# Avatar Upload Configuration
AVATAR_UPLOAD_DIR = ROOT_DIR / "uploads" / "avatars"
AVATAR_MAX_SIZE_MB = 5  # Increased to 5MB (will be optimized before storage)
AVATAR_MAX_SIZE_BYTES = AVATAR_MAX_SIZE_MB * 1024 * 1024  # 5MB
ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"]

# Avatar Optimization Configuration
AVATAR_OUTPUT_SIZE = 256  # Max width/height in pixels
AVATAR_OUTPUT_QUALITY = 80  # WebP quality (75-85 range)
AVATAR_TARGET_SIZE_KB = 150  # Target ~100-250KB

# Status Configuration
VALID_STATUSES = ["Draft", "Submitted", "InProgress", "ReadyForReview", "ChangesRequested", "Approved", "Rejected", "Scheduled", "Published"]

# Migration mapping for old statuses
STATUS_MIGRATION_MAP = {
    "Producing": "InProgress",
    "Review": "ReadyForReview"
}

# ==================== RBAC CONFIGURATION ====================
# Role-Based Access Control for pages and actions

# Valid roles
VALID_ROLES = ["Admin", "Editor", "Producer", "Approver"]

# Page access permissions: page -> list of allowed roles
PAGE_PERMISSIONS = {
    "dashboard": ["Admin", "Editor", "Producer", "Approver"],
    "tasks": ["Admin", "Editor", "Producer", "Approver"],
    "task_details": ["Admin", "Editor", "Producer", "Approver"],
    "calendar": ["Admin", "Editor", "Producer", "Approver"],
    "activity_log": ["Admin", "Editor"],  # Only Admin and Editor (Ministry) can view
    "settings": ["Admin"],  # Admin only
    "avatars": ["Admin"],  # Admin only (part of settings)
    "users": ["Admin"],  # Admin only (part of settings)
}

# Action permissions: action -> list of allowed roles
ACTION_PERMISSIONS = {
    # Task actions
    "create_task": ["Admin", "Editor"],
    "edit_task": ["Admin", "Editor", "Producer"],
    "delete_task": ["Admin"],
    "view_task": ["Admin", "Editor", "Producer", "Approver"],
    
    # Video actions
    "upload_video": ["Admin", "Editor"],
    "delete_video": ["Admin", "Editor"],
    "download_video": ["Admin", "Editor", "Producer", "Approver"],
    "stream_video": ["Admin", "Editor", "Producer", "Approver"],
    
    # User management
    "view_users": ["Admin"],
    "create_user": ["Admin"],
    "edit_user": ["Admin"],
    "delete_user": ["Admin"],
    
    # Avatar management
    "manage_avatars": ["Admin"],
    
    # Audit/Activity log
    "view_audit_logs": ["Admin", "Editor"],
    
    # Comments
    "add_comment": ["Admin", "Editor", "Producer", "Approver"],
    "view_comments": ["Admin", "Editor", "Producer", "Approver"],
}

def check_page_access(role: str, page: str) -> tuple[bool, str]:
    """
    Check if a role has access to a page.
    Returns (allowed, error_message)
    """
    allowed_roles = PAGE_PERMISSIONS.get(page, [])
    if role in allowed_roles:
        return True, ""
    return False, f"Access denied: {role} cannot access {page}"

def check_action_permission(role: str, action: str) -> tuple[bool, str]:
    """
    Check if a role can perform an action.
    Returns (allowed, error_message)
    """
    allowed_roles = ACTION_PERMISSIONS.get(action, [])
    if role in allowed_roles:
        return True, ""
    return False, f"Permission denied: {role} cannot perform {action}"

# Note: require_page_access and require_action are defined after get_current_user

def migrate_status(status: str) -> str:
    """Migrate old status values to new ones"""
    return STATUS_MIGRATION_MAP.get(status, status)

def migrate_task_status(task: dict) -> dict:
    """Migrate task status if needed"""
    if task and 'status' in task:
        task['status'] = migrate_status(task['status'])
    return task

def optimize_avatar_image(image_bytes: bytes, original_mime: str) -> tuple[bytes, str]:
    """
    Optimize avatar image for storage:
    - Center-crop to square
    - Resize to max 256x256
    - Convert to WebP with quality 80
    - Returns (optimized_bytes, mime_type)
    """
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary (handles RGBA, P mode, etc.)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Center-crop to square
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        img = img.crop((left, top, right, bottom))
        
        # Resize to max 256x256
        if img.size[0] > AVATAR_OUTPUT_SIZE:
            img = img.resize((AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE), Image.Resampling.LANCZOS)
        
        # Convert to WebP with quality optimization
        output = io.BytesIO()
        img.save(output, format='WEBP', quality=AVATAR_OUTPUT_QUALITY, method=6)
        optimized_bytes = output.getvalue()
        
        return optimized_bytes, 'image/webp'
        
    except Exception as e:
        raise ValueError(f"Failed to process image: {str(e)}")

# Create the main app
app = FastAPI()

# Register exception handlers for unified error responses
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: Literal["Admin", "Editor", "Producer", "Approver"]
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Literal["Admin", "Editor", "Producer", "Approver"]
    is_active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["Admin", "Editor", "Producer", "Approver"]] = None
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
    object_id: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # New fields for enterprise-grade audit logging
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: Optional[str] = None

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
    storage_path: Optional[str] = None  # New: Abstract storage path
    storage_key: Optional[str] = None   # Legacy: For backward compatibility
    uploaded_by: str
    uploaded_by_name: str
    created_at: datetime
    updated_at: datetime

# ==================== AVATAR MODELS ====================

class AvatarResponse(BaseModel):
    """Response model for avatar data"""
    id: str
    name: str
    display_name: str
    is_active: bool = True
    has_photo: bool
    photo_data: Optional[str] = None  # base64 encoded image
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AvatarUpdate(BaseModel):
    """Update model for avatar"""
    display_name: Optional[str] = None
    is_active: Optional[bool] = None

# Default avatars configuration
DEFAULT_AVATARS = [
    {"id": "avatar-1", "name": "Avatar 1", "display_name": "Avatar 1", "is_active": True},
    {"id": "avatar-2", "name": "Avatar 2", "display_name": "Avatar 2", "is_active": True},
    {"id": "avatar-3", "name": "Avatar 3", "display_name": "Avatar 3", "is_active": True},
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
            raise AuthError(message="Invalid token", code=ErrorCode.INVALID_TOKEN)
    except JWTError:
        raise AuthError(message="Invalid token", code=ErrorCode.INVALID_TOKEN)
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc is None:
        raise AuthError(message="User not found", code=ErrorCode.INVALID_TOKEN)
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ==================== RBAC DEPENDENCY FACTORIES ====================
# These must be defined after get_current_user

def require_page_access(page: str):
    """
    Dependency factory for page access control.
    Usage: Depends(require_page_access("settings"))
    """
    async def check_access(current_user: User = Depends(get_current_user)):
        allowed, error = check_page_access(current_user.role, page)
        if not allowed:
            raise ForbiddenError(message=error, code=ErrorCode.PERMISSION_DENIED)
        return current_user
    return check_access

def require_action(action: str):
    """
    Dependency factory for action permission control.
    Usage: Depends(require_action("create_task"))
    """
    async def check_permission(current_user: User = Depends(get_current_user)):
        allowed, error = check_action_permission(current_user.role, action)
        if not allowed:
            raise ForbiddenError(message=error, code=ErrorCode.PERMISSION_DENIED)
        return current_user
    return check_permission

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

# ==================== WORKFLOW ENGINE ====================
# Strict status transitions with role-based permissions

# Valid transitions map: from_status -> [to_statuses]
WORKFLOW_TRANSITIONS = {
    "Draft": ["Submitted"],
    "Submitted": ["InProgress"],
    "InProgress": ["ReadyForReview"],
    "ReadyForReview": ["Approved", "ChangesRequested", "Rejected"],
    "ChangesRequested": ["InProgress"],
    "Approved": ["Scheduled"],
    "Rejected": [],  # Terminal state (can only be moved by Admin)
    "Scheduled": ["Published"],
    "Published": []  # Terminal state
}

# Role-based transition permissions
# Each role can only perform specific transitions
ROLE_TRANSITIONS = {
    "Editor": {
        # Ministry Editor permissions
        "Draft": ["Submitted"],
        "Approved": ["Scheduled"],
        "Scheduled": ["Published"]
    },
    "Producer": {
        # V Studio Producer permissions
        "Submitted": ["InProgress"],
        "InProgress": ["ReadyForReview"],
        "ChangesRequested": ["InProgress"]
    },
    "Approver": {
        # Approver permissions
        "ReadyForReview": ["Approved", "ChangesRequested", "Rejected"]
    },
    "Admin": {
        # Admin can do all valid transitions
        "Draft": ["Submitted"],
        "Submitted": ["InProgress"],
        "InProgress": ["ReadyForReview"],
        "ReadyForReview": ["Approved", "ChangesRequested", "Rejected"],
        "ChangesRequested": ["InProgress"],
        "Approved": ["Scheduled"],
        "Rejected": ["Draft"],  # Admin can reset rejected tasks
        "Scheduled": ["Published"]
    }
}

def validate_transition(from_status: str, to_status: str, role: str) -> tuple[bool, str]:
    """
    Validate if a status transition is allowed for the given role.
    Returns (is_valid, error_message)
    """
    # Migrate old status names
    from_status = migrate_status(from_status)
    to_status = migrate_status(to_status)
    
    # Check if transition is structurally valid
    valid_targets = WORKFLOW_TRANSITIONS.get(from_status, [])
    if to_status not in valid_targets:
        # Admin special case: can reset Rejected to Draft
        if role == "Admin" and from_status == "Rejected" and to_status == "Draft":
            return True, ""
        return False, f"Invalid transition: {from_status} → {to_status}"
    
    # Check if role is allowed to perform this transition
    role_allowed = ROLE_TRANSITIONS.get(role, {})
    allowed_targets = role_allowed.get(from_status, [])
    
    if to_status not in allowed_targets:
        return False, f"{role} cannot transition from {from_status} to {to_status}"
    
    return True, ""

def get_available_transitions_for_role(current_status: str, role: str) -> list:
    """
    Get list of valid next statuses for a given role and current status.
    Returns list of status strings that the user can transition to.
    """
    current_status = migrate_status(current_status)
    role_allowed = ROLE_TRANSITIONS.get(role, {})
    return role_allowed.get(current_status, [])

# ==================== STARTUP ====================

@app.on_event("startup")
async def initialize_services():
    """Initialize all services that need database access"""
    # Initialize audit logger with database
    audit_logger.set_database(db)
    logger.info("Audit logger initialized")

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
                "display_name": avatar.get("display_name", avatar["name"]),
                "is_active": avatar.get("is_active", True),
                "has_photo": False,
                "photo_data": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.avatars.insert_one(avatar_doc)
            logger.info(f"Seeded avatar: {avatar['name']}")
        else:
            # Ensure existing avatars have the new fields
            update_fields = {}
            if 'display_name' not in existing:
                update_fields['display_name'] = existing.get('name', avatar['name'])
            if 'is_active' not in existing:
                update_fields['is_active'] = True
            if 'created_at' not in existing:
                update_fields['created_at'] = datetime.now(timezone.utc).isoformat()
            if update_fields:
                await db.avatars.update_one({"id": avatar["id"]}, {"$set": update_fields})
                logger.info(f"Updated avatar with new fields: {avatar['name']}")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, http_request: Request):
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user_doc:
        # Log failed login attempt (safe)
        try:
            await audit_logger.log_login_failed(request.email, "User not found", http_request)
        except Exception as e:
            logger.error(f"Audit logging failed for login failure: {e}")
        raise AuthError(message="Invalid credentials", code=ErrorCode.INVALID_CREDENTIALS)
    
    if not verify_password(request.password, user_doc["hashed_password"]):
        # Log failed login attempt (safe)
        try:
            await audit_logger.log_login_failed(request.email, "Invalid password", http_request)
        except Exception as e:
            logger.error(f"Audit logging failed for login failure: {e}")
        raise AuthError(message="Invalid credentials", code=ErrorCode.INVALID_CREDENTIALS)
    
    if not user_doc["is_active"]:
        # Log failed login attempt (safe)
        try:
            await audit_logger.log_login_failed(request.email, "Account disabled", http_request)
        except Exception as e:
            logger.error(f"Audit logging failed for login failure: {e}")
        raise ForbiddenError(message="Account is disabled", code=ErrorCode.ACCOUNT_DISABLED)
    
    token = create_access_token({"sub": user_doc["id"]})
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    
    # Log successful login (safe)
    try:
        await audit_logger.log_login_success(user, http_request)
    except Exception as e:
        logger.error(f"Audit logging failed for login success: {e}")
    
    return LoginResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/auth/permissions")
async def get_permissions(current_user: User = Depends(get_current_user)):
    """
    Get current user's permissions (pages and actions they can access).
    Frontend uses this to show/hide UI elements.
    """
    role = current_user.role
    
    # Get accessible pages
    accessible_pages = [page for page, roles in PAGE_PERMISSIONS.items() if role in roles]
    
    # Get allowed actions
    allowed_actions = [action for action, roles in ACTION_PERMISSIONS.items() if role in roles]
    
    # Get workflow transitions
    workflow_transitions = ROLE_TRANSITIONS.get(role, {})
    
    return {
        "role": role,
        "pages": accessible_pages,
        "actions": allowed_actions,
        "workflow_transitions": workflow_transitions
    }

# ==================== USER ENDPOINTS ====================

@api_router.get("/users", response_model=List[User])
async def list_users(current_user: User = Depends(require_action("view_users"))):
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(100)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, request: Request, current_user: User = Depends(require_action("create_user"))):
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise ValidationError(message="Email already exists", code=ErrorCode.DUPLICATE_ENTRY)
    
    import uuid
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    user_dict["id"] = str(uuid.uuid4())
    user_dict["hashed_password"] = hash_password(password)
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_user_create(current_user, user_dict["id"], user_data.email, request)
    except Exception as e:
        logger.error(f"Audit logging failed for user creation: {e}")
    
    user_dict.pop("hashed_password")
    user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    return User(**user_dict)

@api_router.patch("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, request: Request, current_user: User = Depends(require_action("edit_user"))):
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise NotFoundError(message="User not found", code=ErrorCode.USER_NOT_FOUND)
    
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
        # Audit log with try/catch safety
        try:
            await audit_logger.log_user_update(current_user, user_id, update_dict, request)
        except Exception as e:
            logger.error(f"Audit logging failed for user update: {e}")
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return User(**updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request, current_user: User = Depends(require_action("delete_user"))):
    if user_id == current_user.id:
        raise ValidationError(message="Cannot delete yourself", code=ErrorCode.VALIDATION_ERROR)
    
    # Get user email before deletion for audit log
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise NotFoundError(message="User not found", code=ErrorCode.USER_NOT_FOUND)
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_user_delete(current_user, user_id, user_doc.get("email") if user_doc else None, request)
    except Exception as e:
        logger.error(f"Audit logging failed for user deletion: {e}")
    
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
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
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
async def create_task(task_data: TaskCreate, request: Request, current_user: User = Depends(require_action("create_task"))):
    import uuid
    task_dict = task_data.model_dump()
    task_dict["id"] = str(uuid.uuid4())
    task_dict["status"] = "Draft"
    task_dict["owner"] = current_user.id
    task_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    task_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    task_dict["publish_datetime"] = task_dict["publish_datetime"].isoformat()
    
    await db.tasks.insert_one(task_dict)
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_task_create(current_user, task_dict["id"], task_data.title, request)
    except Exception as e:
        logger.error(f"Audit logging failed for task creation: {e}")
    
    task_dict['created_at'] = datetime.fromisoformat(task_dict['created_at'])
    task_dict['updated_at'] = datetime.fromisoformat(task_dict['updated_at'])
    task_dict['publish_datetime'] = datetime.fromisoformat(task_dict['publish_datetime'])
    return Task(**task_dict)

@api_router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, request: Request, current_user: User = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
    # Permission checks
    if current_user.role == "Approver":
        raise ForbiddenError(message="Approvers cannot edit task fields", code=ErrorCode.PERMISSION_DENIED)
    
    if current_user.role == "Editor" and existing["status"] in ["Scheduled", "Published"]:
        raise ForbiddenError(message="Cannot edit tasks that are Scheduled or Published", code=ErrorCode.PERMISSION_DENIED)
    
    update_dict = {k: v for k, v in task_data.model_dump().items() if v is not None}
    if update_dict:
        if "publish_datetime" in update_dict:
            update_dict["publish_datetime"] = update_dict["publish_datetime"].isoformat()
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.tasks.update_one({"id": task_id}, {"$set": update_dict})
        
        # Audit log with try/catch safety
        try:
            await audit_logger.log_task_update(current_user, task_id, update_dict, request)
        except Exception as e:
            logger.error(f"Audit logging failed for task update: {e}")
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    if isinstance(updated.get('publish_datetime'), str):
        updated['publish_datetime'] = datetime.fromisoformat(updated['publish_datetime'])
    
    return Task(**updated)

@api_router.patch("/tasks/{task_id}/status", response_model=Task)
async def change_task_status(task_id: str, status_change: StatusChange, request: Request, current_user: User = Depends(get_current_user)):
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
    old_status = migrate_status(existing["status"])
    new_status = status_change.status
    
    # Validate transition using workflow engine
    is_valid, error_msg = validate_transition(old_status, new_status, current_user.role)
    if not is_valid:
        raise ForbiddenError(message=error_msg, code=ErrorCode.INVALID_STATUS_TRANSITION)
    
    # Check video requirement for Published
    if new_status == "Published":
        # Placeholder check - in Phase 2, check if video exists
        pass
    
    update_dict = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_dict})
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_status_change(current_user, task_id, old_status, new_status, request)
    except Exception as e:
        logger.error(f"Audit logging failed for status change: {e}")
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    if isinstance(updated.get('publish_datetime'), str):
        updated['publish_datetime'] = datetime.fromisoformat(updated['publish_datetime'])
    
    return Task(**updated)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request, current_user: User = Depends(require_action("delete_task"))):
    # Get task title before deletion for audit log
    task_doc = await db.tasks.find_one({"id": task_id}, {"_id": 0, "title": 1})
    
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_task_delete(current_user, task_id, task_doc.get("title") if task_doc else None, request)
    except Exception as e:
        logger.error(f"Audit logging failed for task deletion: {e}")
    
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
async def create_comment(task_id: str, comment_data: CommentCreate, request: Request, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
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
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_comment_create(current_user, task_id, comment_data.message[:50], request)
    except Exception as e:
        logger.error(f"Audit logging failed for comment creation: {e}")
    
    comment_dict['created_at'] = datetime.fromisoformat(comment_dict['created_at'])
    return Comment(**comment_dict)

# ==================== AUDIT LOG ENDPOINTS ====================

@api_router.get("/audit-logs", response_model=List[AuditLog])
async def list_audit_logs(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(require_action("view_audit_logs"))
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
        # Ensure all fields are present (handle legacy logs missing new fields)
        # Map new fields to legacy if not present
        if 'actor_id' not in log and 'user_id' in log:
            log['actor_id'] = log.get('user_id', 'system')
        if 'actor_name' not in log and 'user_name' in log:
            log['actor_name'] = log.get('user_name', 'System')
        if 'object_type' not in log and 'entity_type' in log:
            log['object_type'] = log.get('entity_type', '')
        if 'object_id' not in log and 'entity_id' in log:
            log['object_id'] = log.get('entity_id')
        # Ensure actor_id has a default (avoid None)
        if not log.get('actor_id'):
            log['actor_id'] = log.get('user_id', 'system')
        if not log.get('actor_name'):
            log['actor_name'] = log.get('user_name', 'System')
        if not log.get('object_type'):
            log['object_type'] = log.get('entity_type', '')
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
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
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
async def create_video_record(task_id: str, video_data: VideoCreate, request: Request, current_user: User = Depends(get_current_user)):
    """Initialize a video record for a task (preparation for upload)"""
    import uuid
    
    # Verify task exists
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
    # Check if video already exists for this task
    existing_video = await db.videos.find_one({"task_id": task_id})
    if existing_video:
        raise ConflictError(message="Video already exists for this task. Delete it first to upload a new one.", code=ErrorCode.RESOURCE_CONFLICT)
    
    # Check permissions - Admins and Editors can upload videos
    if current_user.role not in ["Admin", "Editor"]:
        raise ForbiddenError(message="Only Admin and Editor roles can upload videos", code=ErrorCode.PERMISSION_DENIED)
    
    # Check task status - cannot upload to Published tasks
    if task.get("status") == "Published":
        raise ValidationError(message="Cannot upload video to a published task", code=ErrorCode.VALIDATION_ERROR)
    
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
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_video_create(current_user, video_dict["id"], video_data.original_filename, request)
    except Exception as e:
        logger.error(f"Audit logging failed for video record creation: {e}")
    
    video_dict['created_at'] = now
    video_dict['updated_at'] = now
    
    return VideoResponse(**video_dict)

@api_router.patch("/tasks/{task_id}/video", response_model=VideoResponse)
async def update_video_status(task_id: str, video_update: VideoUpdate, request: Request, current_user: User = Depends(get_current_user)):
    """Update video metadata (status, duration, etc.)"""
    # Find existing video
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        raise NotFoundError(message="Video not found for this task", code=ErrorCode.VIDEO_NOT_FOUND)
    
    # Build update dict
    update_data = video_update.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError(message="No update data provided", code=ErrorCode.VALIDATION_ERROR)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track old status for audit
    old_status = video.get("status")
    new_status = update_data.get("status", old_status)
    
    await db.videos.update_one({"task_id": task_id}, {"$set": update_data})
    
    # Audit log with try/catch safety
    if old_status != new_status:
        try:
            await audit_logger.log_video_status_change(current_user, video["id"], old_status, new_status, request)
        except Exception as e:
            logger.error(f"Audit logging failed for video status change: {e}")
    
    # Fetch updated video
    updated_video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if isinstance(updated_video.get('created_at'), str):
        updated_video['created_at'] = datetime.fromisoformat(updated_video['created_at'])
    if isinstance(updated_video.get('updated_at'), str):
        updated_video['updated_at'] = datetime.fromisoformat(updated_video['updated_at'])
    
    return VideoResponse(**updated_video)

@api_router.delete("/tasks/{task_id}/video", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(task_id: str, request: Request, current_user: User = Depends(get_current_user)):
    """Delete video record and file for a task"""
    # Find existing video
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        raise NotFoundError(message="Video not found for this task", code=ErrorCode.VIDEO_NOT_FOUND)
    
    # Check permissions
    if current_user.role not in ["Admin", "Editor"]:
        raise ForbiddenError(message="Only Admin and Editor roles can delete videos", code=ErrorCode.PERMISSION_DENIED)
    
    # Verify task isn't published
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if task and task.get("status") == "Published":
        raise ValidationError(message="Cannot delete video from a published task", code=ErrorCode.VALIDATION_ERROR)
    
    # Delete the actual file via storage service
    storage_path = video.get("storage_path")
    if not storage_path:
        # Legacy format: storage_key doesn't include "videos/" prefix
        storage_key = video.get("storage_key")
        if storage_key:
            storage_path = f"videos/{storage_key}"
    
    if storage_path:
        await storage_service.delete_file(storage_path)
    
    await db.videos.delete_one({"task_id": task_id})
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_video_delete(current_user, task_id, video.get("original_filename"), request)
    except Exception as e:
        logger.error(f"Audit logging failed for video deletion: {e}")
    
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
async def upload_video(task_id: str, request: Request, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """
    Upload a video file for a task.
    
    Validates:
    - Max size: 100MB
    - Allowed types: video/mp4, video/webm, video/quicktime
    
    Uses storage service abstraction for file operations.
    """
    import uuid
    
    # Check permissions - Admins and Editors can upload videos
    if current_user.role not in ["Admin", "Editor"]:
        raise ForbiddenError(message="Only Admin and Editor roles can upload videos", code=ErrorCode.PERMISSION_DENIED)
    
    # Verify task exists
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise NotFoundError(message="Task not found", code=ErrorCode.TASK_NOT_FOUND)
    
    # Check task status - cannot upload to Published tasks
    if task.get("status") == "Published":
        raise ValidationError(message="Cannot upload video to a published task", code=ErrorCode.VALIDATION_ERROR)
    
    # Validate file type
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise ValidationError(
            message=f"Invalid file type. Only MP4, WebM, MOV allowed. Got: {file.content_type}",
            code=ErrorCode.INVALID_FILE_TYPE
        )
    
    # Read file to check size (and for writing)
    contents = await file.read()
    file_size = len(contents)
    
    # Validate file size (100MB limit)
    if file_size > VIDEO_MAX_SIZE_BYTES:
        raise ValidationError(
            message=f"File too large. Maximum size is {VIDEO_MAX_SIZE_MB}MB. Got: {file_size / (1024*1024):.1f}MB",
            code=ErrorCode.FILE_TOO_LARGE
        )
    
    # Check if video already exists - if so, delete old file first
    existing_video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if existing_video:
        # Delete old file via storage service
        if existing_video.get("storage_path"):
            await storage_service.delete_file(existing_video["storage_path"])
        # Delete old record
        await db.videos.delete_one({"task_id": task_id})
    
    # Generate unique video ID
    video_id = str(uuid.uuid4())
    
    try:
        # Save file via storage service
        storage_result = await storage_service.save_file(
            file_data=contents,
            original_filename=file.filename,
            folder="videos",
            subfolder=task_id
        )
        
        # Create video record with storage abstraction fields
        now = datetime.now(timezone.utc)
        video_dict = {
            "id": video_id,
            "task_id": task_id,
            "filename": storage_result["stored_filename"],
            "original_filename": file.filename,
            "file_size": file_size,
            "mime_type": file.content_type,
            "status": "ready",
            "storage_provider": storage_result["provider"],
            "storage_path": storage_result["storage_path"],
            # Legacy field for backward compatibility
            "storage_key": storage_result["storage_path"],
            "uploaded_by": current_user.id,
            "uploaded_by_name": current_user.name,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.videos.insert_one(video_dict)
        
        # Audit log with try/catch safety
        try:
            await audit_logger.log_video_upload(current_user, task_id, file.filename, request)
        except Exception as e:
            logger.error(f"Audit logging failed for video upload: {e}")
        
        video_dict['created_at'] = now
        video_dict['updated_at'] = now
        
        return VideoResponse(**video_dict)
        
    except Exception as e:
        # Clean up file if it was saved
        if 'storage_result' in locals() and storage_result.get("storage_path"):
            await storage_service.delete_file(storage_result["storage_path"])
        
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
        
        # Audit log with try/catch safety
        try:
            await audit_logger.log(
                user=current_user,
                action=AuditAction.UPLOAD_FAILED,
                entity_type=EntityType.VIDEO,
                entity_id=task_id,
                new_value=str(e),
                request=request
            )
        except Exception as audit_e:
            logger.error(f"Audit logging failed for video upload failure: {audit_e}")
        
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

@api_router.get("/tasks/{task_id}/video/download")
async def download_video(task_id: str, current_user: User = Depends(get_current_user)):
    """
    Download video file for a task.
    
    Returns:
    - 200: Streaming file download with proper headers
    - 404: No video found or file missing
    - 400: Video not ready for download
    
    Headers set:
    - Content-Type: video mime type
    - Content-Disposition: attachment with original filename
    - Content-Length: file size
    """
    # All authenticated roles can download (Admin, Editor, Approver, Producer)
    
    # Find video record
    video = await db.videos.find_one({"task_id": task_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="No video found for this task")
    
    # Check video status - only allow download when ready
    if video.get("status") != "ready":
        raise HTTPException(
            status_code=400, 
            detail=f"Video is not ready for download. Current status: {video.get('status')}"
        )
    
    # Get storage path (use storage_path, fallback to storage_key for legacy)
    storage_path = video.get("storage_path")
    if not storage_path:
        # Legacy format: storage_key doesn't include "videos/" prefix
        storage_key = video.get("storage_key")
        if storage_key:
            storage_path = f"videos/{storage_key}"
    
    if not storage_path:
        raise HTTPException(status_code=404, detail="Video file path not found in database")
    
    # Check if file exists via storage service
    if not storage_service.file_exists(storage_path):
        raise HTTPException(status_code=404, detail="Video file not found on server")
    
    # Get original filename and mime type
    original_filename = video.get("original_filename", "video.mp4")
    mime_type = video.get("mime_type", "video/mp4")
    
    # Return streaming response via storage service
    return await storage_service.get_file_response(
        storage_path=storage_path,
        original_filename=original_filename,
        media_type=mime_type,
        as_attachment=True
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
    
    # Get actual mime type from video record
    mime_type = video.get("mime_type", "video/mp4")
    
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": mime_type
    }
    
    status_code = 206 if range else 200
    
    return StreamingResponse(
        iterfile(),
        status_code=status_code,
        headers=headers,
        media_type=mime_type
    )

# ==================== AVATAR ENDPOINTS ====================

@api_router.get("/avatars", response_model=List[AvatarResponse])
async def list_avatars(current_user: User = Depends(get_current_user)):
    """Get all 3 fixed avatars with their photo data"""
    avatars = await db.avatars.find({}, {"_id": 0}).to_list(10)
    
    # Ensure all 3 avatars exist with new fields
    if len(avatars) < 3:
        for default_avatar in DEFAULT_AVATARS:
            existing = await db.avatars.find_one({"id": default_avatar["id"]})
            if not existing:
                avatar_doc = {
                    "id": default_avatar["id"],
                    "name": default_avatar["name"],
                    "display_name": default_avatar.get("display_name", default_avatar["name"]),
                    "is_active": default_avatar.get("is_active", True),
                    "has_photo": False,
                    "photo_data": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.avatars.insert_one(avatar_doc)
        avatars = await db.avatars.find({}, {"_id": 0}).to_list(10)
    
    result = []
    for avatar in avatars:
        # Ensure all required fields exist
        if 'display_name' not in avatar:
            avatar['display_name'] = avatar.get('name', 'Avatar')
        if 'is_active' not in avatar:
            avatar['is_active'] = True
        if 'created_at' not in avatar:
            avatar['created_at'] = None
        
        if isinstance(avatar.get('updated_at'), str):
            avatar['updated_at'] = datetime.fromisoformat(avatar['updated_at'])
        if isinstance(avatar.get('created_at'), str):
            avatar['created_at'] = datetime.fromisoformat(avatar['created_at'])
        result.append(AvatarResponse(**avatar))
    
    return result

@api_router.patch("/avatars/{avatar_id}", response_model=AvatarResponse)
async def update_avatar(
    avatar_id: str,
    avatar_update: AvatarUpdate,
    request: Request,
    current_user: User = Depends(require_action("manage_avatars"))
):
    """Update avatar display_name or is_active status (Admin only)"""
    # Find avatar
    avatar = await db.avatars.find_one({"id": avatar_id}, {"_id": 0})
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Capture old values for audit (used in changes dict)
    old_display_name = avatar.get("display_name")
    old_is_active = avatar.get("is_active")
    
    # Build update dict
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    changes = {}
    
    if avatar_update.display_name is not None:
        update_data["display_name"] = avatar_update.display_name
        changes["display_name"] = avatar_update.display_name
    
    if avatar_update.is_active is not None:
        update_data["is_active"] = avatar_update.is_active
        changes["is_active"] = avatar_update.is_active
    
    await db.avatars.update_one({"id": avatar_id}, {"$set": update_data})
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_avatar_update(current_user, avatar_id, changes, request)
    except Exception as e:
        logger.error(f"Audit logging failed for avatar update: {e}")
    
    # Return updated avatar
    updated = await db.avatars.find_one({"id": avatar_id}, {"_id": 0})
    if 'display_name' not in updated:
        updated['display_name'] = updated.get('name', 'Avatar')
    if 'is_active' not in updated:
        updated['is_active'] = True
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    
    return AvatarResponse(**updated)

@api_router.post("/avatars/{avatar_id}/photo", response_model=AvatarResponse)
async def upload_avatar_photo(
    avatar_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_action("manage_avatars"))
):
    """Upload a photo for an avatar (Admin only) with automatic optimization"""
    import base64
    
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
    
    # Optimize image: center-crop, resize to 256x256, convert to WebP
    try:
        optimized_bytes, optimized_mime = optimize_avatar_image(contents, file.content_type)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Image processing failed. The file may be corrupted or invalid. {str(e)}"
        )
    
    # Encode optimized image to base64
    photo_base64 = base64.b64encode(optimized_bytes).decode('utf-8')
    
    # Create data URL with mime type prefix
    photo_data = f"data:{optimized_mime};base64,{photo_base64}"
    
    # Log optimization stats
    original_kb = file_size / 1024
    optimized_kb = len(optimized_bytes) / 1024
    logger.info(f"Avatar optimized: {original_kb:.1f}KB -> {optimized_kb:.1f}KB ({optimized_kb/original_kb*100:.0f}%)")
    
    # Update avatar
    update_data = {
        "has_photo": True,
        "photo_data": photo_data,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.avatars.update_one({"id": avatar_id}, {"$set": update_data})
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_avatar_photo_upload(current_user, avatar_id, f"{file.filename} (optimized: {optimized_kb:.1f}KB)", request)
    except Exception as e:
        logger.error(f"Audit logging failed for avatar photo upload: {e}")
    
    # Return updated avatar
    updated = await db.avatars.find_one({"id": avatar_id}, {"_id": 0})
    if 'display_name' not in updated:
        updated['display_name'] = updated.get('name', 'Avatar')
    if 'is_active' not in updated:
        updated['is_active'] = True
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    
    return AvatarResponse(**updated)

@api_router.delete("/avatars/{avatar_id}/photo", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar_photo(
    avatar_id: str,
    request: Request,
    current_user: User = Depends(require_action("manage_avatars"))
):
    """Remove photo from an avatar (Admin only)"""
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
    
    # Audit log with try/catch safety
    try:
        await audit_logger.log_avatar_photo_delete(current_user, avatar_id, request)
    except Exception as e:
        logger.error(f"Audit logging failed for avatar photo delete: {e}")
    
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
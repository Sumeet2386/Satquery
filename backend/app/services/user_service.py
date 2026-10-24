"""SatQuery AI — User Service (data access layer for User model)."""

import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.models.user import User

logger = structlog.get_logger(__name__)


class UserService:
    """Handles all database operations for User records."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.id == uuid.UUID(user_id))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def create(self, email: str, hashed_password: str, full_name: str) -> User:
        user = User(
            email=email.lower(),
            hashed_password=hashed_password,
            full_name=full_name,
        )
        self.db.add(user)
        await self.db.flush()  # Get the generated ID before commit
        logger.info("User created", user_id=str(user.id), email=email)
        return user

    async def set_active(self, user_id: str, active: bool) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if user:
            user.is_active = active
            await self.db.flush()
        return user

    async def update_password(self, user_id: str, new_hashed_password: str) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if user:
            user.hashed_password = new_hashed_password
            await self.db.flush()
        return user

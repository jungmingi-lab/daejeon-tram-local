from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import generate_salt, generate_token, hash_password
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.AuthResponse)
def register(body: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다")

    salt = generate_salt()
    user = models.User(
        email=body.email,
        password_hash=hash_password(body.password, salt),
        salt=salt.hex(),
    )
    db.add(user)
    db.flush()

    token = generate_token()
    db.add(models.AuthToken(token=token, user_id=user.id))
    db.commit()

    return {"token": token, "email": user.email}


@router.post("/login", response_model=schemas.AuthResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or hash_password(body.password, bytes.fromhex(user.salt)) != user.password_hash:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    token = generate_token()
    db.add(models.AuthToken(token=token, user_id=user.id))
    db.commit()

    return {"token": token, "email": user.email}

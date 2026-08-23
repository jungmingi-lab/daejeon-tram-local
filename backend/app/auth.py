"""
쿠폰 인증 같은 회원 전용 기능에만 쓰는 최소 인증.
정류장/POI 조회 등 기본 관광정보 API는 이 모듈을 거치지 않고 공개로 둔다.

구현을 단순하게 유지하기 위해 JWT 대신 DB에 저장하는 opaque 토큰 방식을 쓴다.
비밀번호는 표준 라이브러리 hashlib(PBKDF2)로 해시한다 (추가 의존성 불필요).
"""

import hashlib
import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from . import models
from .database import get_db

PBKDF2_ITERATIONS = 100_000


def generate_salt() -> bytes:
    return secrets.token_bytes(16)


def hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS).hex()


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")

    token = authorization.removeprefix("Bearer ")
    auth_token = db.query(models.AuthToken).filter(models.AuthToken.token == token).first()
    if not auth_token:
        raise HTTPException(status_code=401, detail="유효하지 않은 로그인 세션입니다")

    return auth_token.user

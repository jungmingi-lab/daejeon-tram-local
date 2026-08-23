import os

from dotenv import load_dotenv

load_dotenv()

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
TOURAPI_SERVICE_KEY = os.getenv("TOURAPI_SERVICE_KEY", "")
DEFAULT_RADIUS_M = int(os.getenv("DEFAULT_RADIUS_M", "800"))

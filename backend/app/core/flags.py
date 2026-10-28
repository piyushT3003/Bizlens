from typing import Dict
from app.core.config import settings


class FeatureFlags:
    def __init__(self) -> None:
        self._flags: Dict[str, bool] = {
            "ENABLE_ANOMALY_DETECTION": False,
            "ENABLE_FORECASTING": False,
            "ENABLE_WHAT_IF": False,
            "ENABLE_LIVE_DATA": False,
            "ENABLE_CHAT_DATASET": False,
            "ENABLE_GLOBE_VIEW": False,
            "ENABLE_EXPLAIN_CHART": False,
        }
        self._load_from_env()

    def _load_from_env(self) -> None:
        if settings.FEATURE_FLAGS:
            for key in settings.FEATURE_FLAGS.split(","):
                k = key.strip()
                if k:
                    self._flags[k] = True

    def is_enabled(self, key: str) -> bool:
        return self._flags.get(key, False)

    def set_flag(self, key: str, enabled: bool) -> None:
        self._flags[key] = enabled

    def get_all(self) -> Dict[str, bool]:
        return dict(self._flags)


flags = FeatureFlags()

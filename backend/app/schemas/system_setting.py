from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SystemSettingBase(BaseModel):
    setting_key: str
    setting_value: str

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    setting_value: str

class SystemSettingResponse(SystemSettingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

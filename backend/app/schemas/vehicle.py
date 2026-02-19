import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class VehicleCreate(BaseModel):
    plate_number: str
    make: str | None = None
    model: str | None = None
    year: int | None = None
    color: str | None = None
    vin: str | None = None
    vehicle_type: str = "motorcycle"
    ownership: str = "company"
    rental_company: str | None = None
    current_mileage: int | None = None
    fuel_type: str | None = None
    assigned_driver_id: uuid.UUID | None = None
    insurance_expiry: date | None = None
    registration_expiry: date | None = None
    notes: str | None = None


class VehicleUpdate(BaseModel):
    plate_number: str | None = None
    make: str | None = None
    model: str | None = None
    year: int | None = None
    color: str | None = None
    vehicle_type: str | None = None
    ownership: str | None = None
    rental_company: str | None = None
    current_mileage: int | None = None
    fuel_type: str | None = None
    status: str | None = None
    assigned_driver_id: uuid.UUID | None = None
    insurance_expiry: date | None = None
    registration_expiry: date | None = None
    notes: str | None = None


class VehicleResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    plate_number: str
    make: str | None
    model: str | None
    year: int | None
    color: str | None
    vin: str | None
    vehicle_type: str
    ownership: str
    rental_company: str | None
    current_mileage: int | None
    fuel_type: str | None
    status: str
    assigned_driver_id: uuid.UUID | None
    insurance_expiry: date | None
    registration_expiry: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceCreate(BaseModel):
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID | None = None
    date: date
    category: str
    type: str
    description: str | None = None
    cost: Decimal | None = None
    vendor: str | None = None
    mileage_at_service: int | None = None
    notes: str | None = None


class MaintenanceUpdate(BaseModel):
    status: str | None = None
    cost: Decimal | None = None
    vendor: str | None = None
    spare_vehicle_id: uuid.UUID | None = None
    mechanic_dispatched: bool | None = None
    notes: str | None = None


class MaintenanceResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID | None
    date: date
    category: str
    type: str
    description: str | None
    cost: Decimal | None
    vendor: str | None
    mileage_at_service: int | None
    duration_hours: Decimal | None
    receipt_url: str | None
    status: str
    source: str
    spare_vehicle_id: uuid.UUID | None
    mechanic_dispatched: bool | None
    police_report_url: str | None
    medical_report_url: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InspectionCreate(BaseModel):
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID
    shift_id: uuid.UUID | None = None
    checklist: dict = {}
    photos: list = []
    overall_status: str = "pass"
    notes: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None


class InspectionResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID
    shift_id: uuid.UUID | None
    inspected_at: datetime
    checklist: dict
    photos: list
    overall_status: str
    notes: str | None
    location_lat: float | None
    location_lng: float | None

    model_config = {"from_attributes": True}


Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  subscriptionPlan: 'subscriptionPlan',
  settings: 'settings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompanyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  platform: 'platform',
  licenseCount: 'licenseCount',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  phone: 'phone',
  passwordHash: 'passwordHash',
  name: 'name',
  role: 'role',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DriverScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  name: 'name',
  phone: 'phone',
  platform: 'platform',
  platformDriverId: 'platformDriverId',
  utr: 'utr',
  vehicleType: 'vehicleType',
  zone: 'zone',
  batchNumber: 'batchNumber',
  status: 'status',
  hireDate: 'hireDate',
  photoUrl: 'photoUrl',
  supervisorId: 'supervisorId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  healthCertExpiry: 'healthCertExpiry',
  healthCertStatus: 'healthCertStatus',
  workPermitExpiry: 'workPermitExpiry',
  workPermitStatus: 'workPermitStatus',
  foodHandlingCertExpiry: 'foodHandlingCertExpiry',
  foodHandlingCertStatus: 'foodHandlingCertStatus',
  vehicleRegExpiry: 'vehicleRegExpiry',
  vehicleRegStatus: 'vehicleRegStatus',
  vehicleInsuranceExpiry: 'vehicleInsuranceExpiry',
  vehicleInsuranceStatus: 'vehicleInsuranceStatus',
  drivingLicenseExpiry: 'drivingLicenseExpiry',
  drivingLicenseStatus: 'drivingLicenseStatus',
  civilIdExpiry: 'civilIdExpiry',
  civilIdStatus: 'civilIdStatus'
};

exports.Prisma.DriverInventoryScalarFieldEnum = {
  id: 'id',
  driverId: 'driverId',
  itemType: 'itemType',
  issued: 'issued',
  quantity: 'quantity',
  issuedDate: 'issuedDate',
  returnedDate: 'returnedDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RecruitmentPipelineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  candidateName: 'candidateName',
  phone: 'phone',
  stage: 'stage',
  agency: 'agency',
  expectedDate: 'expectedDate',
  notes: 'notes',
  assignedCompanyId: 'assignedCompanyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VehicleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  plateNumber: 'plateNumber',
  vehicleType: 'vehicleType',
  make: 'make',
  model: 'model',
  year: 'year',
  color: 'color',
  chassisNumber: 'chassisNumber',
  mileage: 'mileage',
  fuelType: 'fuelType',
  ownerCompany: 'ownerCompany',
  driverIqama: 'driverIqama',
  status: 'status',
  assignedDriverId: 'assignedDriverId',
  insuranceExpiry: 'insuranceExpiry',
  registrationExpiry: 'registrationExpiry',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShiftScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  date: 'date',
  platform: 'platform',
  zone: 'zone',
  scheduledStart: 'scheduledStart',
  scheduledEnd: 'scheduledEnd',
  actualStart: 'actualStart',
  actualEnd: 'actualEnd',
  status: 'status',
  isValid: 'isValid',
  plannedHoursMinutes: 'plannedHoursMinutes',
  actualHoursMinutes: 'actualHoursMinutes',
  selfieUrl: 'selfieUrl',
  selfieLocation: 'selfieLocation',
  clockInMethod: 'clockInMethod',
  clockOutMethod: 'clockOutMethod',
  shiftScreenshotUrl: 'shiftScreenshotUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  shiftId: 'shiftId',
  date: 'date',
  status: 'status',
  lateMinutes: 'lateMinutes',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  shiftId: 'shiftId',
  date: 'date',
  platform: 'platform',
  orderCount: 'orderCount',
  distanceKm: 'distanceKm',
  cashCollected: 'cashCollected',
  tips: 'tips',
  totalAmount: 'totalAmount',
  orderNumber: 'orderNumber',
  paymentSource: 'paymentSource',
  arrivalTime: 'arrivalTime',
  screenshotUrl: 'screenshotUrl',
  source: 'source',
  rawData: 'rawData',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CashRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  date: 'date',
  salesAmount: 'salesAmount',
  collectionAmount: 'collectionAmount',
  depositMethod: 'depositMethod',
  depositReceiptUrl: 'depositReceiptUrl',
  pendingDues: 'pendingDues',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CashTransactionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  date: 'date',
  type: 'type',
  amount: 'amount',
  orderNumber: 'orderNumber',
  description: 'description',
  runningBalance: 'runningBalance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PendingDuesLedgerScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  month: 'month',
  openingBalance: 'openingBalance',
  totalSales: 'totalSales',
  totalCollection: 'totalCollection',
  cashDeposits: 'cashDeposits',
  bankTransfers: 'bankTransfers',
  incentives: 'incentives',
  adjustments: 'adjustments',
  closingBalance: 'closingBalance',
  dailySales: 'dailySales',
  dailyCollections: 'dailyCollections',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VehicleInspectionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vehicleId: 'vehicleId',
  driverId: 'driverId',
  date: 'date',
  status: 'status',
  photos: 'photos',
  notes: 'notes',
  deductionApplied: 'deductionApplied',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaintenanceRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vehicleId: 'vehicleId',
  driverId: 'driverId',
  category: 'category',
  type: 'type',
  cost: 'cost',
  vendor: 'vendor',
  receiptUrl: 'receiptUrl',
  spareVehicleId: 'spareVehicleId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeviceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  imei: 'imei',
  model: 'model',
  osVersion: 'osVersion',
  agentVersion: 'agentVersion',
  lastSeen: 'lastSeen',
  batteryLevel: 'batteryLevel',
  isOnline: 'isOnline',
  status: 'status',
  lastLatitude: 'lastLatitude',
  lastLongitude: 'lastLongitude',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CapturedOrderScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  driverId: 'driverId',
  platform: 'platform',
  notificationText: 'notificationText',
  parsedData: 'parsedData',
  capturedAt: 'capturedAt'
};

exports.Prisma.LocationLogScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  driverId: 'driverId',
  latitude: 'latitude',
  longitude: 'longitude',
  accuracy: 'accuracy',
  speed: 'speed',
  capturedAt: 'capturedAt'
};

exports.Prisma.AppUsageLogScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  driverId: 'driverId',
  appPackage: 'appPackage',
  eventType: 'eventType',
  durationSeconds: 'durationSeconds',
  capturedAt: 'capturedAt'
};

exports.Prisma.DeviceCommandScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  command: 'command',
  payload: 'payload',
  status: 'status',
  issuedById: 'issuedById',
  issuedAt: 'issuedAt',
  acknowledgedAt: 'acknowledgedAt'
};

exports.Prisma.AiScoreScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  date: 'date',
  compositeScore: 'compositeScore',
  attendanceScore: 'attendanceScore',
  deliveryScore: 'deliveryScore',
  financialScore: 'financialScore',
  equipmentScore: 'equipmentScore',
  platformScore: 'platformScore',
  breakdown: 'breakdown',
  trend: 'trend',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AlertScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  severity: 'severity',
  title: 'title',
  message: 'message',
  driverId: 'driverId',
  vehicleId: 'vehicleId',
  data: 'data',
  status: 'status',
  acknowledgedById: 'acknowledgedById',
  acknowledgedAt: 'acknowledgedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AiDigestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  date: 'date',
  content: 'content',
  generatedAt: 'generatedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  changes: 'changes',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.TicketScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  ticketNumber: 'ticketNumber',
  category: 'category',
  priority: 'priority',
  title: 'title',
  description: 'description',
  submitterType: 'submitterType',
  submitterDriverId: 'submitterDriverId',
  submitterUserId: 'submitterUserId',
  assignedToId: 'assignedToId',
  status: 'status',
  photos: 'photos',
  resolution: 'resolution',
  resolvedAt: 'resolvedAt',
  slaDeadline: 'slaDeadline',
  platform: 'platform',
  companyId: 'companyId',
  driverId: 'driverId',
  vehicleId: 'vehicleId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  type: 'type',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  status: 'status',
  reviewedById: 'reviewedById',
  reviewedAt: 'reviewedAt',
  reviewNotes: 'reviewNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TalabatSessionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  shiftId: 'shiftId',
  date: 'date',
  zone: 'zone',
  vehicleType: 'vehicleType',
  sessionCode: 'sessionCode',
  plannedStart: 'plannedStart',
  plannedEnd: 'plannedEnd',
  approvedStart: 'approvedStart',
  approvedEnd: 'approvedEnd',
  actualStart: 'actualStart',
  actualEnd: 'actualEnd',
  plannedHours: 'plannedHours',
  approvedHours: 'approvedHours',
  actualHours: 'actualHours',
  deliveries: 'deliveries',
  cashCollected: 'cashCollected',
  tips: 'tips',
  distanceKm: 'distanceKm',
  status: 'status',
  faceVerified: 'faceVerified',
  equipmentVerified: 'equipmentVerified',
  gpsCompliance: 'gpsCompliance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TalabatComplianceEventScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  sessionId: 'sessionId',
  type: 'type',
  description: 'description',
  metadata: 'metadata',
  resolved: 'resolved',
  resolvedAt: 'resolvedAt',
  resolvedBy: 'resolvedBy',
  createdAt: 'createdAt'
};

exports.Prisma.TalabatDeliveryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  sessionId: 'sessionId',
  date: 'date',
  platformOrderId: 'platformOrderId',
  shortCode: 'shortCode',
  finishedAt: 'finishedAt',
  orderType: 'orderType',
  amount: 'amount',
  tip: 'tip',
  distanceKm: 'distanceKm',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KeetaDailyMetricsScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  date: 'date',
  courierPlatformId: 'courierPlatformId',
  supervisorName: 'supervisorName',
  vehicleType: 'vehicleType',
  onShift: 'onShift',
  validDay: 'validDay',
  onlineTime: 'onlineTime',
  validOnlineTime: 'validOnlineTime',
  peakOnlineMinutes: 'peakOnlineMinutes',
  acceptedTasks: 'acceptedTasks',
  restaurantArrivals: 'restaurantArrivals',
  deliveredTasks: 'deliveredTasks',
  largeOrdersCompleted: 'largeOrdersCompleted',
  cancelledTasks: 'cancelledTasks',
  rejectedTasks: 'rejectedTasks',
  rejectedByCourier: 'rejectedByCourier',
  rejectedAuto: 'rejectedAuto',
  cancellationRate: 'cancellationRate',
  completionRate: 'completionRate',
  onTimeRate: 'onTimeRate',
  largeOrderOnTimeRate: 'largeOrderOnTimeRate',
  avgDeliveryMinutes: 'avgDeliveryMinutes',
  over55minProportion: 'over55minProportion',
  overdueOrders: 'overdueOrders',
  severelyOverdue: 'severelyOverdue',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlatformSettingsScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  platform: 'platform',
  targets: 'targets',
  kpis: 'kpis',
  shiftRules: 'shiftRules',
  zones: 'zones',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompanyInventoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  itemType: 'itemType',
  total: 'total',
  issued: 'issued',
  available: 'available',
  minStock: 'minStock',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AmericanaDailyOrdersScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  month: 'month',
  chain: 'chain',
  empId: 'empId',
  storeName: 'storeName',
  costCenter: 'costCenter',
  company: 'company',
  position: 'position',
  dailyOrders: 'dailyOrders',
  totalOrders: 'totalOrders',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KpiDefinitionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  category: 'category',
  unit: 'unit',
  platform: 'platform',
  target: 'target',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KpiRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  driverId: 'driverId',
  kpiDefinitionId: 'kpiDefinitionId',
  date: 'date',
  value: 'value',
  target: 'target',
  score: 'score',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  severity: 'severity',
  sourceId: 'sourceId',
  metadata: 'metadata',
  read: 'read',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationRuleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  eventType: 'eventType',
  role: 'role',
  enabled: 'enabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.SubscriptionPlan = exports.$Enums.SubscriptionPlan = {
  FREE: 'FREE',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE'
};

exports.Platform = exports.$Enums.Platform = {
  KEETA: 'KEETA',
  TALABAT: 'TALABAT',
  DELIVEROO: 'DELIVEROO',
  AMERICANA: 'AMERICANA'
};

exports.UserRole = exports.$Enums.UserRole = {
  ADMIN: 'ADMIN',
  OPS_MANAGER: 'OPS_MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  ACCOUNTANT: 'ACCOUNTANT',
  VIEWER: 'VIEWER'
};

exports.VehicleType = exports.$Enums.VehicleType = {
  MOTORCYCLE: 'MOTORCYCLE',
  CAR: 'CAR'
};

exports.DriverStatus = exports.$Enums.DriverStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
  LEAVE: 'LEAVE',
  TERMINATION: 'TERMINATION'
};

exports.InventoryItemType = exports.$Enums.InventoryItemType = {
  HELMET: 'HELMET',
  TSHIRT: 'TSHIRT',
  PANTS: 'PANTS',
  COOLING_VEST: 'COOLING_VEST',
  SAFETY_VEST: 'SAFETY_VEST',
  WATER_BOTTLE: 'WATER_BOTTLE',
  GLOVES: 'GLOVES',
  SAFETY_KIT: 'SAFETY_KIT',
  BIG_BAG: 'BIG_BAG',
  SMALL_BAG: 'SMALL_BAG',
  CAP: 'CAP',
  MOBILE_PHONE: 'MOBILE_PHONE',
  SIM_CARD: 'SIM_CARD',
  PETROL_CARD: 'PETROL_CARD'
};

exports.RecruitmentStage = exports.$Enums.RecruitmentStage = {
  AGENCY_REFERRAL: 'AGENCY_REFERRAL',
  CV_DOCS: 'CV_DOCS',
  INTERVIEW: 'INTERVIEW',
  VISA_PROCESSING: 'VISA_PROCESSING',
  FLIGHT_ARRANGEMENT: 'FLIGHT_ARRANGEMENT',
  ARRIVAL: 'ARRIVAL',
  MEDICAL_EXAM: 'MEDICAL_EXAM',
  BANK_CARD: 'BANK_CARD',
  CIVIL_ID: 'CIVIL_ID',
  RESIDENCY: 'RESIDENCY',
  LICENSE_TEST: 'LICENSE_TEST',
  PLATFORM_TRAINING: 'PLATFORM_TRAINING',
  ROAD_SAFETY_TRAINING: 'ROAD_SAFETY_TRAINING',
  FOOD_HANDLING_TRAINING: 'FOOD_HANDLING_TRAINING',
  COMPANY_SOP_TRAINING: 'COMPANY_SOP_TRAINING',
  COMPLETED: 'COMPLETED'
};

exports.VehicleStatus = exports.$Enums.VehicleStatus = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED'
};

exports.ShiftStatus = exports.$Enums.ShiftStatus = {
  BOOKED: 'BOOKED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  MISSED: 'MISSED',
  CANCELLED: 'CANCELLED'
};

exports.AttendanceStatus = exports.$Enums.AttendanceStatus = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  ABSENT: 'ABSENT',
  EARLY_LEAVE: 'EARLY_LEAVE',
  EXCUSED: 'EXCUSED'
};

exports.OrderSource = exports.$Enums.OrderSource = {
  MANUAL: 'MANUAL',
  SCREENSHOT_OCR: 'SCREENSHOT_OCR',
  EXCEL_IMPORT: 'EXCEL_IMPORT',
  AGENT_CAPTURE: 'AGENT_CAPTURE',
  WHATSAPP: 'WHATSAPP'
};

exports.DepositMethod = exports.$Enums.DepositMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  AL_MUZAINI: 'AL_MUZAINI'
};

exports.CashStatus = exports.$Enums.CashStatus = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  SETTLED: 'SETTLED'
};

exports.CashTransactionType = exports.$Enums.CashTransactionType = {
  COLLECTION: 'COLLECTION',
  CASH_OUT: 'CASH_OUT',
  INVOICE_DEDUCTION: 'INVOICE_DEDUCTION'
};

exports.LedgerStatus = exports.$Enums.LedgerStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
};

exports.InspectionStatus = exports.$Enums.InspectionStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL'
};

exports.MaintenanceCategory = exports.$Enums.MaintenanceCategory = {
  SCHEDULED: 'SCHEDULED',
  UNSCHEDULED: 'UNSCHEDULED',
  EMERGENCY: 'EMERGENCY'
};

exports.MaintenanceStatus = exports.$Enums.MaintenanceStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.DeviceStatus = exports.$Enums.DeviceStatus = {
  ACTIVE: 'ACTIVE',
  LOST: 'LOST',
  DECOMMISSIONED: 'DECOMMISSIONED'
};

exports.DeviceCommandType = exports.$Enums.DeviceCommandType = {
  LOCK: 'LOCK',
  WIPE: 'WIPE',
  INSTALL_APP: 'INSTALL_APP',
  UNINSTALL_APP: 'UNINSTALL_APP',
  SEND_MESSAGE: 'SEND_MESSAGE',
  ENABLE_KIOSK: 'ENABLE_KIOSK',
  DISABLE_KIOSK: 'DISABLE_KIOSK',
  UPDATE_AGENT: 'UPDATE_AGENT'
};

exports.CommandStatus = exports.$Enums.CommandStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  FAILED: 'FAILED'
};

exports.ScoreTrend = exports.$Enums.ScoreTrend = {
  UP: 'UP',
  DOWN: 'DOWN',
  STABLE: 'STABLE'
};

exports.AlertSeverity = exports.$Enums.AlertSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.AlertStatus = exports.$Enums.AlertStatus = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED'
};

exports.TicketCategory = exports.$Enums.TicketCategory = {
  VEHICLE_REPAIR: 'VEHICLE_REPAIR',
  EQUIPMENT_REQUEST: 'EQUIPMENT_REQUEST',
  LEAVE_REQUEST: 'LEAVE_REQUEST',
  COMPLAINT: 'COMPLAINT',
  OTHER: 'OTHER'
};

exports.TicketPriority = exports.$Enums.TicketPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.SubmitterType = exports.$Enums.SubmitterType = {
  DRIVER: 'DRIVER',
  USER: 'USER'
};

exports.TicketStatus = exports.$Enums.TicketStatus = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

exports.LeaveType = exports.$Enums.LeaveType = {
  SICK: 'SICK',
  VACATION: 'VACATION',
  EMERGENCY: 'EMERGENCY',
  PERSONAL: 'PERSONAL'
};

exports.LeaveStatus = exports.$Enums.LeaveStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.TalabatSessionStatus = exports.$Enums.TalabatSessionStatus = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW'
};

exports.ComplianceEventType = exports.$Enums.ComplianceEventType = {
  SELFIE_FAIL: 'SELFIE_FAIL',
  GPS_OFF: 'GPS_OFF',
  EQUIPMENT_MISSING: 'EQUIPMENT_MISSING',
  SHIFT_NOT_BOOKED: 'SHIFT_NOT_BOOKED',
  ORDER_CLICK_THROUGH: 'ORDER_CLICK_THROUGH',
  LATE_CLOCK_IN: 'LATE_CLOCK_IN',
  EARLY_CLOCK_OUT: 'EARLY_CLOCK_OUT',
  ZONE_MISMATCH: 'ZONE_MISMATCH',
  OUT_OF_ZONE: 'OUT_OF_ZONE',
  CASH_THRESHOLD_EXCEEDED: 'CASH_THRESHOLD_EXCEEDED'
};

exports.KpiCategory = exports.$Enums.KpiCategory = {
  ATTENDANCE: 'ATTENDANCE',
  ORDERS: 'ORDERS',
  DELIVERY_EFFICIENCY: 'DELIVERY_EFFICIENCY',
  FINANCIAL: 'FINANCIAL',
  COMPLIANCE: 'COMPLIANCE',
  CUSTOM: 'CUSTOM'
};

exports.KpiUnit = exports.$Enums.KpiUnit = {
  PERCENTAGE: 'PERCENTAGE',
  COUNT: 'COUNT',
  MINUTES: 'MINUTES',
  HOURS: 'HOURS',
  CURRENCY: 'CURRENCY',
  SCORE: 'SCORE'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  Company: 'Company',
  User: 'User',
  Driver: 'Driver',
  DriverInventory: 'DriverInventory',
  RecruitmentPipeline: 'RecruitmentPipeline',
  Vehicle: 'Vehicle',
  Shift: 'Shift',
  AttendanceRecord: 'AttendanceRecord',
  OrderLog: 'OrderLog',
  CashRecord: 'CashRecord',
  CashTransaction: 'CashTransaction',
  PendingDuesLedger: 'PendingDuesLedger',
  VehicleInspection: 'VehicleInspection',
  MaintenanceRecord: 'MaintenanceRecord',
  Device: 'Device',
  CapturedOrder: 'CapturedOrder',
  LocationLog: 'LocationLog',
  AppUsageLog: 'AppUsageLog',
  DeviceCommand: 'DeviceCommand',
  AiScore: 'AiScore',
  Alert: 'Alert',
  AiDigest: 'AiDigest',
  AuditLog: 'AuditLog',
  Ticket: 'Ticket',
  LeaveRequest: 'LeaveRequest',
  TalabatSession: 'TalabatSession',
  TalabatComplianceEvent: 'TalabatComplianceEvent',
  TalabatDelivery: 'TalabatDelivery',
  KeetaDailyMetrics: 'KeetaDailyMetrics',
  PlatformSettings: 'PlatformSettings',
  CompanyInventory: 'CompanyInventory',
  AmericanaDailyOrders: 'AmericanaDailyOrders',
  KpiDefinition: 'KpiDefinition',
  KpiRecord: 'KpiRecord',
  Notification: 'Notification',
  NotificationRule: 'NotificationRule'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)

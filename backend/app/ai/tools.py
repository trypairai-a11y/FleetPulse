"""Claude tool definitions for fleet data access."""

FLEET_TOOLS = [
    {
        "name": "get_fleet_overview",
        "description": "Get a high-level overview of the fleet: total drivers, active count, vehicles, orders today, attendance rate, open tickets, and device status.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_driver_info",
        "description": "Get detailed info about a specific driver by name (Arabic or English) or employee ID. Returns profile, current status, vehicle, recent stats.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Driver name (partial match OK), Arabic name, or employee ID",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_driver_list",
        "description": "Get a filtered list of drivers. Can filter by status, platform, or get top/bottom performers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["active", "inactive", "on_leave", "suspended"],
                    "description": "Filter by driver status",
                },
                "platform": {
                    "type": "string",
                    "enum": ["talabat", "keeta", "deliveroo", "jahez"],
                    "description": "Filter by delivery platform",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 10)",
                    "default": 10,
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_attendance_summary",
        "description": "Get attendance summary for today or a specific date. Shows present, late, absent counts and rates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Defaults to today.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_order_summary",
        "description": "Get order summary for today or a specific date. Shows total orders, breakdown by platform, top drivers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. Defaults to today.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_vehicle_status",
        "description": "Get vehicle fleet status: active, in maintenance, and decommissioned counts. Lists vehicles needing attention.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_maintenance_summary",
        "description": "Get maintenance records summary. Shows pending, recent completions, and cost totals.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "Look back period in days (default 30)",
                    "default": 30,
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_cash_summary",
        "description": "Get cash collection/deposit summary. Shows total collected, deposited, outstanding balance, and drivers with outstanding cash.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_ticket_summary",
        "description": "Get support ticket summary: open, in-progress, resolved counts by category and priority.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_active_alerts",
        "description": "Get current active alerts/anomalies detected by the system.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Filter by severity level",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_driver_scores",
        "description": "Get AI performance scores for drivers. Can get top performers, lowest scores, or a specific driver's score history.",
        "input_schema": {
            "type": "object",
            "properties": {
                "driver_name": {
                    "type": "string",
                    "description": "Optional: specific driver name to look up",
                },
                "sort": {
                    "type": "string",
                    "enum": ["highest", "lowest"],
                    "description": "Sort by score (default: highest)",
                    "default": "highest",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results (default 10)",
                    "default": 10,
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_device_status",
        "description": "Get device/phone fleet status: online, offline, battery levels, last heartbeat times.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]

package com.fleetpulse.agent.navigation

sealed class Routes(val route: String) {
    data object Registration : Routes("registration")
    data object Home : Routes("home")
    data object ClockIn : Routes("clock_in")
    data object ClockOut : Routes("clock_out")
    data object Inspection : Routes("inspection")
    data object CashDeposit : Routes("cash_deposit")
    data object Maintenance : Routes("maintenance")
}

package com.fleetpulse.agent.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.ui.cashdeposit.CashDepositScreen
import com.fleetpulse.agent.ui.clockin.ClockInScreen
import com.fleetpulse.agent.ui.clockout.ClockOutScreen
import com.fleetpulse.agent.ui.home.HomeScreen
import com.fleetpulse.agent.ui.inspection.InspectionScreen
import com.fleetpulse.agent.ui.maintenance.MaintenanceScreen
import com.fleetpulse.agent.ui.registration.RegistrationScreen

@Composable
fun AppNavHost(
    prefsManager: PrefsManager,
    navController: NavHostController = rememberNavController()
) {
    val startDestination = if (prefsManager.isRegistered) {
        Routes.Home.route
    } else {
        Routes.Registration.route
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Routes.Registration.route) {
            RegistrationScreen(
                onRegistrationSuccess = {
                    navController.navigate(Routes.Home.route) {
                        popUpTo(Routes.Registration.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.Home.route) {
            HomeScreen(
                onClockIn = { navController.navigate(Routes.ClockIn.route) },
                onClockOut = { navController.navigate(Routes.ClockOut.route) },
                onInspection = { navController.navigate(Routes.Inspection.route) },
                onCashDeposit = { navController.navigate(Routes.CashDeposit.route) },
                onMaintenance = { navController.navigate(Routes.Maintenance.route) }
            )
        }

        composable(Routes.ClockIn.route) {
            ClockInScreen(
                onSuccess = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.ClockOut.route) {
            ClockOutScreen(
                onSuccess = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.Inspection.route) {
            InspectionScreen(
                onSuccess = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.CashDeposit.route) {
            CashDepositScreen(
                onSuccess = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.Maintenance.route) {
            MaintenanceScreen(
                onSuccess = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }
    }
}

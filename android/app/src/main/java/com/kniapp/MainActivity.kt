package com.kniapp

import android.animation.ObjectAnimator
import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateInterpolator
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "KNIApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // Must be called before super.onCreate(); the default system exit transition
    // is abrupt on several OEM skins, so this replaces it with a plain fade-out.
    val splashScreen = installSplashScreen()
    super.onCreate(null)

    // Edge-to-edge is now unavoidable on this device/target SDK (react-native-keyboard-controller
    // requires it to read accurate IME insets - see useKeyboardHeight.js), and once active, Android
    // no longer lets us paint a custom statusBarColor - the status bar is always transparent, so our
    // own screen content has to extend under it. Setting this here, before React even initializes,
    // avoids a race where keyboard-controller's own edge-to-edge detection run after our React root
    // mounts and briefly/permanently leaves content padded below the status bar instead of under it
    // (which showed up as a blank white gap where the status bar icons should be).
    WindowCompat.setDecorFitsSystemWindows(window, false)
    // White/light icons by default - matches the brand-red headers most screens use. Screens with a
    // light header already call StatusBar.setBarStyle('dark-content') from JS, which still works
    // correctly under edge-to-edge (it goes through this same WindowInsetsController API).
    WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = false

    splashScreen.setOnExitAnimationListener { splashScreenView ->
      ObjectAnimator.ofFloat(splashScreenView.view, View.ALPHA, 1f, 0f).apply {
        duration = 300L
        interpolator = AccelerateInterpolator()
        doOnEnd { splashScreenView.remove() }
        start()
      }
    }
  }
}

private fun ObjectAnimator.doOnEnd(action: () -> Unit) {
  addListener(object : android.animation.AnimatorListenerAdapter() {
    override fun onAnimationEnd(animation: android.animation.Animator) = action()
  })
}

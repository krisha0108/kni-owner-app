package com.kniapp

import android.animation.ObjectAnimator
import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateInterpolator
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
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

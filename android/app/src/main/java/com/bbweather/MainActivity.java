package com.bbweather;

import android.view.KeyEvent;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;

public class MainActivity extends ReactActivity {
    @Override
    protected String getMainComponentName() {
        return "BBWeather";
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_DPAD_UP ||
            keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
            keyCode == KeyEvent.KEYCODE_DPAD_LEFT ||
            keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
            keyCode == KeyEvent.KEYCODE_DPAD_CENTER ||
            keyCode == KeyEvent.KEYCODE_ENTER) {

            ReactInstanceManager mgr = getReactNativeHost().getReactInstanceManager();
            ReactContext ctx = mgr.getCurrentReactContext();
            if (ctx != null) {
                KeyEventModule mod = ctx.getNativeModule(KeyEventModule.class);
                if (mod != null) {
                    mod.onKeyDown(keyCode);
                    if (keyCode != KeyEvent.KEYCODE_BACK) {
                        return true;
                    }
                }
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}

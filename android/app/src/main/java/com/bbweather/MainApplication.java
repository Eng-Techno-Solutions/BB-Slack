package com.bbweather;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.zmxv.RNSound.RNSoundPackage;
import com.rnfs.RNFSPackage;

import java.security.Security;
import java.util.Arrays;
import java.util.List;

import org.conscrypt.Conscrypt;

public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            return Arrays.<ReactPackage>asList(
                new MainReactPackage(),
                new RNSoundPackage(),
                new RNFSPackage(),
                new HttpPackage()
            );
        }
    };

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Security.insertProviderAt(Conscrypt.newProvider(), 1);
        SoLoader.init(this, false);
    }
}

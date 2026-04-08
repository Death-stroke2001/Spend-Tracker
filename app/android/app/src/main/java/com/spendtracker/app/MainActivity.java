package com.spendtracker.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.spendtracker.app.sms.SmsReceiverPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the custom SMS receiver plugin
        registerPlugin(SmsReceiverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

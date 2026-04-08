package com.spendtracker.app.sms;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * Capacitor plugin that listens for incoming SMS messages and forwards
 * bank transaction SMS to the web layer for parsing.
 *
 * Flow:
 * 1. Web layer calls startListening() to register the BroadcastReceiver
 * 2. When an SMS arrives, the receiver fires
 * 3. We check if it looks like a bank SMS (has amount patterns)
 * 4. If yes, we emit an "smsReceived" event to the web layer
 * 5. Web layer parses it and shows a local notification
 */
@CapacitorPlugin(
    name = "SmsReceiver",
    permissions = {
        @Permission(strings = { Manifest.permission.RECEIVE_SMS }, alias = "receive_sms"),
        @Permission(strings = { Manifest.permission.READ_SMS }, alias = "read_sms"),
    }
)
public class SmsReceiverPlugin extends Plugin {

    private static final String TAG = "SmsReceiverPlugin";
    private static final String SMS_RECEIVED_ACTION = "android.provider.Telephony.SMS_RECEIVED";

    private BroadcastReceiver smsReceiver;
    private boolean isListening = false;

    /**
     * Start listening for incoming SMS. Must be called from the web layer.
     */
    @PluginMethod
    public void startListening(PluginCall call) {
        if (isListening) {
            call.resolve(new JSObject().put("status", "already_listening"));
            return;
        }

        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!SMS_RECEIVED_ACTION.equals(intent.getAction())) return;

                Bundle bundle = intent.getExtras();
                if (bundle == null) return;

                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus == null) return;

                String format = bundle.getString("format");

                StringBuilder fullMessage = new StringBuilder();
                String sender = "";

                for (Object pdu : pdus) {
                    SmsMessage smsMessage;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                    } else {
                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                    }

                    if (smsMessage != null) {
                        fullMessage.append(smsMessage.getMessageBody());
                        sender = smsMessage.getOriginatingAddress();
                    }
                }

                String messageBody = fullMessage.toString();
                String senderAddress = sender != null ? sender : "";

                Log.d(TAG, "SMS received from: " + senderAddress);

                // Quick check: does this look like a bank/transaction SMS?
                if (looksLikeBankSms(messageBody)) {
                    Log.d(TAG, "Bank SMS detected, forwarding to web layer");

                    JSObject data = new JSObject();
                    data.put("message", messageBody);
                    data.put("sender", senderAddress);
                    data.put("timestamp", System.currentTimeMillis());

                    // Emit event to web layer
                    notifyListeners("smsReceived", data);
                } else {
                    Log.d(TAG, "Non-bank SMS, ignoring");
                }
            }
        };

        IntentFilter filter = new IntentFilter(SMS_RECEIVED_ACTION);
        filter.setPriority(999);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(smsReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(smsReceiver, filter);
        }

        isListening = true;
        Log.d(TAG, "SMS listener started");
        call.resolve(new JSObject().put("status", "listening"));
    }

    /**
     * Stop listening for SMS.
     */
    @PluginMethod
    public void stopListening(PluginCall call) {
        if (smsReceiver != null && isListening) {
            getContext().unregisterReceiver(smsReceiver);
            smsReceiver = null;
            isListening = false;
        }
        call.resolve(new JSObject().put("status", "stopped"));
    }

    /**
     * Check if the plugin is currently listening.
     */
    @PluginMethod
    public void isListening(PluginCall call) {
        call.resolve(new JSObject().put("listening", isListening));
    }

    /**
     * Quick heuristic to filter bank/transaction SMS from spam.
     * Checks for amount patterns and transaction keywords.
     */
    private boolean looksLikeBankSms(String message) {
        if (message == null || message.isEmpty()) return false;

        String lower = message.toLowerCase();

        // Must have an amount pattern
        boolean hasAmount = message.matches("(?s).*(?:Rs\\.?|INR|₹)\\s*[\\d,]+.*")
            || message.matches("(?s).*[\\d,]+(?:\\.\\d{1,2})?\\s*(?:Rs\\.?|INR|₹).*");

        if (!hasAmount) return false;

        // Must have a transaction keyword
        boolean hasTransactionKeyword =
            lower.contains("debited") || lower.contains("credited") ||
            lower.contains("spent") || lower.contains("received") ||
            lower.contains("transferred") || lower.contains("paid") ||
            lower.contains("withdrawn") || lower.contains("deposited") ||
            lower.contains("txn") || lower.contains("transaction") ||
            lower.contains("upi");

        // Must NOT be an OTP
        boolean isOtp = lower.contains("otp") || lower.contains("one time password")
            || lower.contains("verification code");

        return hasTransactionKeyword && !isOtp;
    }

    @Override
    protected void handleOnDestroy() {
        if (smsReceiver != null && isListening) {
            try {
                getContext().unregisterReceiver(smsReceiver);
            } catch (Exception e) {
                Log.w(TAG, "Error unregistering SMS receiver", e);
            }
            smsReceiver = null;
            isListening = false;
        }
    }
}

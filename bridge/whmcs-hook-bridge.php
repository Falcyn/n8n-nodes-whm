<?php
/**
 * n8n Hook Bridge for WHMCS
 * -------------------------
 * Forwards selected WHMCS hook events to an n8n "WHMCS Trigger" webhook.
 *
 * INSTALLATION
 *   1. Copy this file into  <whmcs>/includes/hooks/whmcs-hook-bridge.php
 *   2. Set $n8nWebhookUrl to the Production URL from your WHMCS Trigger node.
 *   3. (Recommended) Set $sharedSecret to match the node's "Shared Secret".
 *   4. Edit $forwardEvents to list the hook points you want to forward.
 *
 * WHMCS calls every matching hook synchronously, so this bridge fires the HTTP
 * request with a short timeout and never blocks the WHMCS request on failure.
 *
 * Hook point reference: https://developers.whmcs.com/hooks-reference/
 */

if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
$n8nWebhookUrl = 'https://YOUR-N8N-HOST/webhook/whmcs';
$sharedSecret  = '';            // must match the node's Shared Secret, or '' to disable
$timeoutSecs   = 4;             // keep low so WHMCS is never blocked

// Hook points to forward. Add/remove to taste; must align with the node's Events.
$forwardEvents = array(
    'ClientAdd',
    'ClientClose',
    'InvoiceCreated',
    'InvoicePaid',
    'AcceptOrder',
    'OrderPaid',
    'AfterModuleCreate',
    'AfterModuleSuspend',
    'AfterModuleTerminate',
    'TicketOpen',
    'TicketUserReply',
);

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
function n8n_forward_event($eventName, $vars)
{
    global $n8nWebhookUrl, $sharedSecret, $timeoutSecs;

    if (empty($n8nWebhookUrl) || strpos($n8nWebhookUrl, 'YOUR-N8N-HOST') !== false) {
        return; // not configured
    }

    $payload = json_encode(array(
        'event'     => $eventName,
        'timestamp' => date('c'),
        'data'      => $vars,
    ));

    $headers = array('Content-Type: application/json');
    if (!empty($sharedSecret)) {
        $headers[] = 'X-WHMCS-Secret: ' . $sharedSecret;
    }

    $ch = curl_init($n8nWebhookUrl);
    curl_setopt_array($ch, array(
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeoutSecs,
        CURLOPT_CONNECTTIMEOUT => $timeoutSecs,
    ));
    curl_exec($ch);
    curl_close($ch);
    // Errors are intentionally swallowed so a down n8n never breaks WHMCS.
}

// Register a forwarding closure for every configured event.
foreach ($forwardEvents as $eventName) {
    add_hook($eventName, 1, function ($vars) use ($eventName) {
        n8n_forward_event($eventName, $vars);
    });
}

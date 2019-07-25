<?php
if ($argc > 1) {
    $tokenIdentity = $argv[1];
} else {
    $tokenIdentity = htmlspecialchars($_REQUEST["clientid"]);
}
if ($tokenIdentity == "") {
    echo "0 -- clientid must be an environment variable or GET parameter.";
    return;
}
if ($argc > 2) {
    $tokenPassword = $argv[2];
} else {
    $tokenPassword = htmlspecialchars($_REQUEST['tokenpassword']);
}
if ($tokenPassword == "") {
    echo '0 -- tokenpassword must be a GET parameter.';
    return;
}
$token_password = getenv("TOKEN_PASSWORD");
if ($token_password !== $tokenPassword) {
    // echo "0" . " Environment:" . $token_password . ": Parameter:" . $tokenPassword . ":";
    echo "0 -- invalid tokenpassword";
    return;
}
// echo "+ tokenIdentity: " . $tokenIdentity . ", tokenPassword: " . $tokenPassword . "\n";
require __DIR__ . '/../../twilio-php-master/Twilio/autoload.php';
use Twilio\Jwt\AccessToken;
use Twilio\Jwt\Grants\SyncGrant;
$twilioAccountSid = getenv('ACCOUNT_SID');
$twilioApiKey = getenv('API_KEY');
$twilioApiSecret = getenv('API_KEY_SECRET');
$token = new AccessToken(
    $twilioAccountSid,
    $twilioApiKey,
    $twilioApiSecret,
    3600,
    $tokenIdentity,
        $theGrant
);
//
$serviceSid = getenv('SYNC_SERVICE_SID');
$theGrant = new SyncGrant();
// How to set the Sync service SID into the grant?
// Doesn't work: $theGrant->setServiceSid($serviceSid);
// https://github.com/twilio/twilio-php/blob/master/Twilio/Jwt/Grants/SyncGrant.php
$theGrant->setServiceSid($serviceSid);
$token->addGrant($theGrant);
//
// {message: '', identity: userIdentity,token: token.toJwt()}
echo "{message: '', identity: '" . $tokenIdentity . "',token: '" . $token->toJWT() . "'}";

// echo "\n"
?>

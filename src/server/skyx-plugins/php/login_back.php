<?php

require_once("fs");

if (!isset($_POST["login"])) {
    die ("Must provide a POST `login` parameter");
}
else if (file_get_contents($fs . "/login_hash.txt") != hash("sha256", $_POST["login"])) {
    die("Incorrect credentials");
}
else {
    session_start();
    $_SESSION["login"] = hash("sha256", $_POST["login"]);
    session_write_close();
    echo("login ok");
}
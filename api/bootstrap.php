<?php declare(strict_types=1);

ini_set('error_reporting', '1');
ini_set("display_errors", "1");
error_reporting(E_ALL);


require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
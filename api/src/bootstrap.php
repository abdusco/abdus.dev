<?php namespace abdusdev;

use abdusdev\http\JsonTransportMiddleware;
use abdusdev\messaging\TelegramNotifier;
use Dotenv\Dotenv;
use GuzzleHttp\Client;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

$dotenv = Dotenv::createImmutable([__DIR__ . '/../..']);
$dotenv->load();

$isDev = getenv('APP_ENV') === 'production';

$app = AppFactory::create();
$app->add(new JsonTransportMiddleware($app));
$app->addErrorMiddleware($isDev, true, true);

$app->post('/api/notify', function (Request $request, Response $response) {
    $telegram = makeTelegram();
    $channel = $_ENV['TELEGRAM_CHANNEL'];
    $text = $request->getQueryParams()['text'];
    $result = $telegram->notifyChannel($channel, $text);

    $response->getBody()->write(json_encode(['success' => $result]));
    return $response;
});

function makeTelegram(): TelegramNotifier
{
    return new TelegramNotifier(new Client(), $_ENV['TELEGRAM_BOT_TOKEN'] ?? null);
}

$app->run();

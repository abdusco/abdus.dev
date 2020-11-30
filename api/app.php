<?php declare(strict_types=1);


use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

require_once __DIR__ . '/bootstrap.php';

$request = Request::createFromGlobals();

$httpMethod = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

// Strip query string (?foo=bar) and decode URI
if (false !== $pos = strpos($uri, '?')) {
    $uri = substr($uri, 0, $pos);
}
$uri = rawurldecode($uri);

$dispatcher = FastRoute\simpleDispatcher(function (FastRoute\RouteCollector $r) {
    $r->addRoute('GET', '/api/ping', fn() => new \AbdusCo\Ping());
    $r->addRoute(['GET', 'POST'], '/api/proxy', fn() => new \AbdusCo\Proxy());
});
$routeInfo = $dispatcher->dispatch($httpMethod, $uri);
$response = new Response('oops');
switch ($routeInfo[0]) {
    case FastRoute\Dispatcher::NOT_FOUND:
        $response = new Response(Response::$statusTexts[404], 404);
        break;
    case FastRoute\Dispatcher::METHOD_NOT_ALLOWED:
        $response = new Response(Response::$statusTexts[405], 405);
        break;
    case FastRoute\Dispatcher::FOUND:
        $factory = $routeInfo[1];
        /** @var \AbdusCo\Handler $handler */
        $handler = $factory($request);
        $vars = $routeInfo[2];
        $response = $handler->handle($request, $vars);
        break;
}

$response->send();

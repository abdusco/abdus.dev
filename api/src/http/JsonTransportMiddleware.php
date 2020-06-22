<?php

namespace abdusdev\http;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\App;
use Slim\Exception\HttpException;
use Slim\Exception\HttpNotFoundException;

class JsonTransportMiddleware implements MiddlewareInterface
{
    private App $app;

    /**
     * JsonTransportMiddleware constructor.
     * @param App $app
     */
    public function __construct(App $app)
    {
        $this->app = $app;
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $contentType = $request->getHeaderLine('Content-Type');

        if (strstr($contentType, 'application/json')) {
            $contents = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $request = $request->withParsedBody($contents);
            }
        }

        try {
            return $handler
                ->handle($request)
                ->withHeader('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            $code = 500;
            if ($e instanceof HttpException) {
                $code = $e->getCode();
            }
            $response = $this->app->getResponseFactory()->createResponse($code);
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ], JSON_UNESCAPED_UNICODE));
            return $response->withHeader('Content-Type', 'application/json');
        }
    }
}

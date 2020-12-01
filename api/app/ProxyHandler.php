<?php


namespace AbdusCo;


use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Http\Message\ResponseInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ProxyHandler extends Handler
{
    private static array $corsHeaders = [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'POST, GET, OPTIONS',
    ];

    private static array $safeHeaders = ['user-agent', 'accept', 'content-type', 'cookie', 'cache-control', 'authorization'];

    public function handle(Request $request, array $params = []): Response
    {
        $url = $request->get('url');
        if ($url === null) {
            return $this->error('Missing "url"');
        }

        $options = [
            'headers' => $this->extractRequestHeaders($request),
        ];
        $method = $request->getMethod();
        if ($method === 'POST') {
            $options['body'] = $request->getContent();
        }

        $http = new Client(['timeout' => 5]);
        try {
            $response = $http->request(
                method: $method,
                uri: $url,
                options: $options
            );
        } catch (GuzzleException $e) {
            return $this->error($e->getMessage());
        }

        $headers = $this->extractResponseHeaders($response);
        return new Response(
            content: $response->getBody()->getContents(),
            headers: array_merge($headers, static::$corsHeaders)
        );
    }

    private function extractRequestHeaders(Request $request): array
    {
        $picked = [];
        foreach (static::$safeHeaders as $h) {
            if ($request->headers->has($h)) {
                $picked[$h] = $request->headers->get($h);
            }
        }
        return $picked;
    }

    private function extractResponseHeaders(ResponseInterface $response): array
    {
        $picked = [];
        foreach (static::$safeHeaders as $h) {
            if ($response->hasHeader($h)) {
                $picked[$h] = $response->getHeaderLine($h);
            }
        }
        return $picked;
    }
}
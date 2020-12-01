<?php


namespace AbdusCo;


use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

abstract class Handler
{
    abstract public function handle(Request $request, array $params = []): Response;

    public function json(mixed $data): Response
    {
        return new JsonResponse($data);
    }

    public function text(string $text): Response
    {
        return new Response($text, headers: ['content-type' => 'text/plain']);
    }

    public function html(string $text): Response
    {
        return new Response($text, headers: ['content-type' => 'text/html']);
    }

    public function error(string $message, mixed $extra = [], int $status = 400): Response
    {
        return new JsonResponse(array_merge(
            $extra,
            ['message' => $message],
        ), $status);
    }
}
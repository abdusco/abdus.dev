<?php


namespace AbdusCo;


use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class Ping extends Handler
{
    public function handle(Request $request, array $params = []): Response
    {
        return $this->text('pong');
    }
}
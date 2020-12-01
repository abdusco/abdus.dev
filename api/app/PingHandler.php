<?php


namespace AbdusCo;


use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

final class PingHandler extends Handler
{
    public function handle(Request $request, array $params = []): Response
    {
        return $this->text('pong');
    }
}
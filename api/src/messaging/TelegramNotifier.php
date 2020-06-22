<?php


namespace abdusdev\messaging;


use GuzzleHttp\Client;

final class TelegramNotifier
{
    private string $baseUrl;
    private Client $http;

    /**
     * TelegramNotifier constructor.
     * @param Client $http
     * @param string $token
     */
    public function __construct(\GuzzleHttp\Client $http, string $token)
    {
        $this->baseUrl = "https://api.telegram.org/bot$token";
        $this->http = $http;
    }


    public function notifyChannel(string $channelName, string $text): bool
    {
        $url = "$this->baseUrl/sendMessage";
        $payload = [
            'chat_id' => $channelName,
            'text' => $text
        ];
        $response = $this->http->post($url, [
            'json' => $payload
        ]);
        $json = $response->getBody()->getContents();
        $data = json_decode($json, JSON_THROW_ON_ERROR);
        return $data['ok'];
    }
}
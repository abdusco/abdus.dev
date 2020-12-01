import json
import logging
import pprint
import subprocess
from threading import Thread
from typing import Callable, IO

logging.basicConfig(format='%(asctime)s\t%(source)s:\n%(message)s\n', level=logging.NOTSET)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def run_realtime(args: list[str], on_stdout: Callable[[str], None], on_stderr: Callable[[str], None]):
    def monitor_output(io: IO, callback: Callable[[str], None]):
        for line in iter(io.readline, ''):
            if line.strip():
                callback(line.rstrip())

    proc = subprocess.Popen(
        args=args,
        shell=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    for th in [
        Thread(target=monitor_output, args=(proc.stdout, on_stdout)),
        Thread(target=monitor_output, args=(proc.stderr, on_stderr)),
    ]:
        th.start()

    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.kill()
        raise


def run_caddy():
    kill('caddy.exe')
    run_realtime(
        args=['caddy', 'run', '--config', '.caddyfile', '--adapter', 'caddyfile', '--watch'],
        on_stderr=lambda line: logger.info('%s', pprint.pformat(json.loads(line), width=120), extra=dict(source='caddy')),
        on_stdout=lambda line: logger.info('%s', line, extra=dict(source='caddy')),
    )


def run_php():
    kill('php-cgi.exe')
    run_realtime(
        args=['php-cgi', '-b', '127.0.0.1:9090'],
        on_stderr=lambda line: logger.error('php:\t%s', line),
        on_stdout=lambda line: logger.info('php:\t%s', line),
    )


def kill(exe: str):
    subprocess.run(['taskkill', '/im', exe, '/f'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    threads = [
        Thread(target=run_caddy, daemon=True),
        Thread(target=run_php, daemon=True),
    ]
    for th in threads:
        th.start()
    for th in threads:
        th.join()

    logger.info('exiting')


if __name__ == '__main__':
    main()

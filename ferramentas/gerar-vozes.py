#!/usr/bin/env python3
"""Gera os áudios da narração no ElevenLabs.

A lista de frases vem de js/falas.js — a mesma que o aplicativo usa — então
o texto que aparece na tela e o que a voz diz nunca saem de sincronia.

A chave da API vem de .chave-elevenlabs (ignorado pelo git) ou da variável
ELEVENLABS_API_KEY. Ela nunca é impressa nem passada por linha de comando.

    printf %s 'sua-chave' > .chave-elevenlabs
    python3 ferramentas/gerar-vozes.py --vozes          # lista as vozes da conta
    python3 ferramentas/gerar-vozes.py --voz <id>       # gera tudo
    python3 ferramentas/gerar-vozes.py --voz <id> --so melhorou,piorou

Os arquivos saem em audio/falas/, um mp3 por frase, mais um indice.json que
o aplicativo e o Service Worker leem.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FALAS_JS = RAIZ / 'js' / 'falas.js'
SAIDA = RAIZ / 'audio' / 'falas'
API = 'https://api.elevenlabs.io/v1'

# multilingual_v2 é o modelo estável com português do Brasil.
MODELO = 'eleven_multilingual_v2'
FORMATO = 'mp3_44100_128'


# Onde a chave pode estar, em ordem. O arquivo existe porque cada shell nova
# não herda um `export` digitado noutro terminal — e ele está no .gitignore.
ARQUIVOS_DE_CHAVE = [
    RAIZ / '.chave-elevenlabs',
    Path.home() / '.config' / 'notatiko' / 'elevenlabs.key',
]


def chave():
    k = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if k:
        return k

    for arquivo in ARQUIVOS_DE_CHAVE:
        try:
            k = arquivo.read_text(encoding='utf-8').strip()
        except OSError:
            continue
        if k:
            return k

    sys.exit(
        'Não achei a chave da API. Duas formas:\n\n'
        '  1) num arquivo (vale para qualquer terminal, já ignorado pelo git):\n'
        "     printf %s 'sua-chave' > .chave-elevenlabs\n\n"
        '  2) ou na variável de ambiente, na mesma shell que roda o script:\n'
        "     export ELEVENLABS_API_KEY='sua-chave'\n\n"
        'A chave fica no painel do ElevenLabs, em Profile > API Keys.'
    )


def pedir(caminho, dados=None, chave_api=None, binario=False):
    req = urllib.request.Request(
        f'{API}{caminho}',
        data=json.dumps(dados).encode() if dados else None,
        headers={
            'xi-api-key': chave_api,
            **({'Content-Type': 'application/json'} if dados else {}),
        },
        method='POST' if dados else 'GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read() if binario else json.loads(r.read())
    except urllib.error.HTTPError as e:
        corpo = e.read().decode('utf-8', 'replace')[:400]
        sys.exit(f'ElevenLabs respondeu {e.code}: {corpo}')


def ler_falas():
    """Lê o catálogo de js/falas.js pelo próprio Node, sem duplicar a lista."""
    saida = subprocess.run(
        ['node', '--input-type=module', '-e',
         f'import("{FALAS_JS.as_uri()}").then(m => '
         'console.log(JSON.stringify(m.FALAS)))'],
        capture_output=True, text=True, cwd=RAIZ,
    )
    if saida.returncode != 0:
        sys.exit(f'Não consegui ler {FALAS_JS.name}:\n{saida.stderr}')
    return json.loads(saida.stdout)


def listar_vozes(k):
    vozes = pedir('/voices', chave_api=k)['voices']
    print(f'{len(vozes)} vozes na conta:\n')
    for v in vozes:
        rotulos = v.get('labels') or {}
        tracos = ', '.join(f'{x}' for x in
                           (rotulos.get('gender'), rotulos.get('accent'),
                            rotulos.get('description')) if x)
        print(f"  {v['voice_id']}  {v['name']:<22} {tracos}")
    print('\nPara gerar:  python3 ferramentas/gerar-vozes.py --voz <id>')


def limpar(caminho):
    """Corta o silêncio das pontas e nivela o volume — o ElevenLabs entrega
    sobras de silêncio e alturas diferentes entre uma frase e outra."""
    if not shutil.which('ffmpeg'):
        return
    tmp = caminho.with_suffix('.tmp.mp3')
    r = subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(caminho),
         '-af', 'silenceremove=start_periods=1:start_threshold=-50dB:'
                'start_silence=0.05,areverse,'
                'silenceremove=start_periods=1:start_threshold=-50dB:'
                'start_silence=0.05,areverse,'
                'loudnorm=I=-16:TP=-1.5:LRA=11',
         '-codec:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', str(tmp)],
        capture_output=True, text=True,
    )
    if r.returncode == 0 and tmp.exists() and tmp.stat().st_size > 0:
        tmp.replace(caminho)
    else:
        tmp.unlink(missing_ok=True)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--vozes', action='store_true', help='lista as vozes da conta')
    p.add_argument('--voz', help='id da voz a usar')
    p.add_argument('--so', help='gera só estes grupos (separados por vírgula)')
    p.add_argument('--refazer', action='store_true',
                   help='regera mesmo o que já existe')
    args = p.parse_args()

    k = chave()
    if args.vozes:
        return listar_vozes(k)
    if not args.voz:
        sys.exit('Escolha a voz: --voz <id>. Use --vozes para ver as disponíveis.')

    falas = ler_falas()
    if args.so:
        grupos = {g.strip() for g in args.so.split(',')}
        desconhecidos = grupos - falas.keys()
        if desconhecidos:
            sys.exit(f'Grupo não existe: {", ".join(sorted(desconhecidos))}')
        falas = {g: falas[g] for g in grupos}

    SAIDA.mkdir(parents=True, exist_ok=True)
    indice = {}
    caracteres = 0
    gerados = 0

    for grupo, lista in falas.items():
        for i, texto in enumerate(lista):
            nome = f'{grupo}-{i + 1}'
            destino = SAIDA / f'{nome}.mp3'
            indice[texto] = nome

            if destino.exists() and not args.refazer:
                print(f'  = {nome:<16} (já existe)')
                continue

            audio = pedir(
                f'/text-to-speech/{args.voz}?output_format={FORMATO}',
                {
                    'text': texto,
                    'model_id': MODELO,
                    'voice_settings': {
                        # pouca estabilidade deixa a leitura mais expressiva,
                        # que é o tom de narração esportiva que o app pede
                        'stability': 0.40,
                        'similarity_boost': 0.75,
                        'style': 0.45,
                        'use_speaker_boost': True,
                    },
                },
                chave_api=k, binario=True,
            )
            destino.write_bytes(audio)
            limpar(destino)
            caracteres += len(texto)
            gerados += 1
            print(f'  + {nome:<16} {texto!r}  ({destino.stat().st_size // 1024} KB)')

    # o índice completo (não só o que foi gerado agora) para o app e o SW
    todas = ler_falas()
    completo = {t: f'{g}-{i + 1}'
                for g, lista in todas.items()
                for i, t in enumerate(lista)}
    (SAIDA / 'indice.json').write_text(
        json.dumps({'voz': args.voz, 'modelo': MODELO, 'frases': completo},
                   ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8')

    faltando = [n for n in completo.values() if not (SAIDA / f'{n}.mp3').exists()]
    total = sum(f.stat().st_size for f in SAIDA.glob('*.mp3'))
    print(f'\n{gerados} novos · {caracteres} caracteres consumidos')
    print(f'{len(completo) - len(faltando)}/{len(completo)} frases em '
          f'audio/falas/ · {total // 1024} KB no total')
    if faltando:
        print(f'Ainda faltam: {", ".join(faltando)}')


if __name__ == '__main__':
    main()

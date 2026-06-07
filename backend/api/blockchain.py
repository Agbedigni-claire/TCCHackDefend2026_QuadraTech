"""
Service blockchain local (sans Web3 ni Ethereum).

Chaque Transaction enregistrée crée un nouveau Bloc lié au précédent par son hash.
Le hash est calculé à partir de : index, timestamp (Unix entier), data JSON, previous_hash.
"""

import hashlib
import json

from django.utils import timezone


def calculer_hash(index: int, timestamp, data: dict, previous_hash: str) -> str:
    """Retourne le SHA-256 du contenu d'un bloc.

    Le timestamp est converti en entier Unix pour garantir un résultat
    identique entre la création et la vérification ultérieure.
    """
    contenu = json.dumps(
        {
            'index': index,
            'timestamp': int(timestamp.timestamp()),
            'data': data,
            'previous_hash': previous_hash,
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(contenu.encode('utf-8')).hexdigest()


def ajouter_bloc(data: dict):
    """Crée et persiste un nouveau Bloc lié au dernier bloc existant.

    Si la chaîne est vide, un bloc genesis est créé avec previous_hash='0'*64.
    """
    from .models import Bloc

    dernier = Bloc.objects.order_by('-index').first()

    if dernier is None:
        index = 0
        previous_hash = '0' * 64
    else:
        index = dernier.index + 1
        previous_hash = dernier.hash

    ts = timezone.now()
    hash_value = calculer_hash(index, ts, data, previous_hash)

    return Bloc.objects.create(
        index=index,
        timestamp=ts,
        data=data,
        hash=hash_value,
        previous_hash=previous_hash,
    )


def verifier_chaine() -> bool:
    """Vérifie l'intégrité de toute la chaîne.

    Contrôles effectués pour chaque bloc :
    1. Le hash stocké correspond au hash recalculé.
    2. Le previous_hash correspond bien au hash du bloc précédent.
    """
    from .models import Bloc

    blocs = list(Bloc.objects.order_by('index'))

    if not blocs:
        return True

    for i, bloc in enumerate(blocs):
        hash_attendu = calculer_hash(
            bloc.index,
            bloc.timestamp,
            bloc.data,
            bloc.previous_hash,
        )
        if bloc.hash != hash_attendu:
            return False

        if i > 0 and bloc.previous_hash != blocs[i - 1].hash:
            return False

    return True

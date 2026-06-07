from datetime import timedelta

from django.utils import timezone


def _push_alerte(alerte):
    """Notifie les admin/agents par push quand une alerte est créée."""
    try:
        from .push_service import notify_admins_agents
        niveaux = {'faible': '🟡', 'moyen': '🟠', 'critique': '🔴'}
        icone = niveaux.get(alerte.niveau, '⚠️')
        notify_admins_agents(
            title=f'{icone} Alerte IA — {alerte.get_niveau_display()}',
            body=alerte.description[:100],
            data={'terrainId': alerte.terrain.pk, 'screen': 'terrain'},
        )
    except Exception:
        pass  # Ne jamais bloquer la transaction pour une notification


def analyser_transaction(transaction):
    """
    Applique les règles métier de détection de fraude après création d'une transaction.
    Crée des entrées Alerte pour chaque anomalie détectée.
    """
    from .models import Alerte, Transaction

    terrain    = transaction.terrain
    vendeur    = transaction.vendeur
    maintenant = timezone.now()

    # ── Règle 1 : même terrain en transaction plus de 2 fois en 30 jours ──
    trente_j = maintenant - timedelta(days=30)
    nb_30j = (
        Transaction.objects
        .filter(terrain=terrain, date_transaction__gte=trente_j)
        .exclude(pk=transaction.pk)
        .count()
    )
    if nb_30j >= 2:
        a = Alerte.objects.create(
            terrain=terrain,
            type_alerte=Alerte.TypeAlerte.TRANSACTION_REPETEE,
            description=(
                f"Le terrain « {terrain.adresse} » a fait l'objet de "
                f"{nb_30j + 1} transactions en moins de 30 jours."
            ),
            niveau=Alerte.Niveau.CRITIQUE if nb_30j >= 3 else Alerte.Niveau.MOYEN,
        )
        _push_alerte(a)

    # ── Règle 2 : même vendeur > 3 transactions en 7 jours ────────────────
    sept_j = maintenant - timedelta(days=7)
    nb_7j = (
        Transaction.objects
        .filter(vendeur=vendeur, date_transaction__gte=sept_j)
        .exclude(pk=transaction.pk)
        .count()
    )
    if nb_7j >= 3:
        a = Alerte.objects.create(
            terrain=terrain,
            type_alerte=Alerte.TypeAlerte.VENDEUR_SUSPECT,
            description=(
                f"Le vendeur « {vendeur} » a effectué {nb_7j + 1} transactions "
                f"en moins de 7 jours."
            ),
            niveau=Alerte.Niveau.CRITIQUE,
        )
        _push_alerte(a)

    # ── Règle 3 : deux transactions sur le même terrain le même jour ───────
    aujourd_hui = maintenant.date()
    double_tx = (
        Transaction.objects
        .filter(terrain=terrain, date_transaction__date=aujourd_hui)
        .exclude(pk=transaction.pk)
        .exists()
    )
    if double_tx:
        a = Alerte.objects.create(
            terrain=terrain,
            type_alerte=Alerte.TypeAlerte.DOUBLE_TRANSACTION,
            description=(
                f"Deux transactions ont eu lieu le même jour "
                f"({aujourd_hui.strftime('%d/%m/%Y')}) pour le terrain "
                f"« {terrain.adresse} »."
            ),
            niveau=Alerte.Niveau.CRITIQUE,
        )
        _push_alerte(a)

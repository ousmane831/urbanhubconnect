"""Business Connect (cahier des charges du 20 novembre 2026) : la Coordination associe les demandes et confirme des
rendez-vous sur des créneaux approuvés. Une demande reçue n'est pas un rendez-vous ; seul un rendez-vous confirmé est
communiqué, et un changement indique clairement que l'ancien créneau est annulé. Les chevauchements sont refusés."""
import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import BusinessConnectMeeting as Meeting, BusinessConnectRegistration as Registration, BusinessConnectSlot as Slot

logger = logging.getLogger(__name__)


def active_meetings(reg, statuses=(Meeting.Status.PROPOSED, Meeting.Status.CONFIRMED)):
    return (Meeting.objects.filter(Q(first=reg) | Q(second=reg), status__in=statuses)
            .select_related("slot", "first", "second").order_by("slot__day", "slot__start"))


def other(m, reg):
    return m.second if m.first_id == reg.pk else m.first


def meeting_line(m, reg):
    o = other(m, reg)
    who = f"{o.participant_name}" + (f" ({o.organization})" if o.organization else "")
    return f"{m.slot} · avec {who}" + (f" · table {m.table}" if m.table else "")


@transaction.atomic
def create(first_id, second_id, slot_id, table=""):
    """Rendez-vous proposé (non communiqué) ; refusé en cas de chevauchement."""
    regs = {r.pk: r for r in Registration.objects.select_for_update().filter(pk__in=[first_id, second_id]).exclude(status__in=["rejected", "cancelled"])}
    if first_id == second_id:
        raise ValidationError("Choisissez deux participants différents.")
    if len(regs) != 2:
        raise ValidationError("Participant introuvable ou demande refusée.")
    slot = Slot.objects.filter(pk=slot_id).first()
    if slot is None:
        raise ValidationError("Créneau introuvable.")
    if not slot.is_published:
        raise ValidationError("Ce créneau n'est pas publié : publiez-le d'abord (créneau approuvé).")
    m = Meeting(first=regs[first_id], second=regs[second_id], slot=slot, table=str(table or "").strip()[:20])
    problems = m.conflicts()
    if problems:
        raise ValidationError(" ".join(problems))
    m.save()
    return m


def _send(reg, subject, body):
    from apps.core import dossiers
    text = (f"Bonjour {reg.participant_name},\n\n{body}\n\nSuivre votre dossier : {dossiers.tracking_url(reg.email)}\n\n"
            f"Urban Hub Connect\n\n--\n{dossiers.footer()}")
    try:
        send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [reg.email], fail_silently=False)
        return True
    except Exception:
        logger.exception("E-mail Business Connect non envoyé (%s)", reg.pk)
        return False


@transaction.atomic
def confirm(m):
    """Confirme le rendez-vous et le communique aux deux participants (seulement le créneau effectivement attribué)."""
    m = Meeting.objects.select_for_update().get(pk=m.pk)
    if m.status == Meeting.Status.CONFIRMED:
        return 0
    if m.status == Meeting.Status.CANCELLED:
        raise ValidationError("Ce rendez-vous a été libéré : créez-en un nouveau.")
    problems = m.conflicts()
    if problems:
        raise ValidationError(" ".join(problems))
    m.status, m.confirmed_at = Meeting.Status.CONFIRMED, timezone.now()
    m.save(update_fields=["status", "confirmed_at", "updated_at"])
    for reg in (m.first, m.second):
        if reg.status != "accepted":
            reg.status = "accepted"
            reg.save(update_fields=["status", "updated_at"])
    return sum(_send(reg, "Business Connect : rendez-vous confirmé",
                     f"Votre rendez-vous Business Connect est confirmé :\n{meeting_line(m, reg)}\n\n"
                     "Ce créneau est le seul attribué pour cette rencontre. Présentez votre badge à l'accueil du Grand Week-End.")
               for reg in (m.first, m.second))


@transaction.atomic
def release(m):
    """Libère le créneau. Si le rendez-vous avait été communiqué, les deux participants apprennent qu'il est annulé."""
    m = Meeting.objects.select_for_update().get(pk=m.pk)
    was_confirmed = m.status == Meeting.Status.CONFIRMED
    if m.status == Meeting.Status.CANCELLED:
        return 0
    m.status = Meeting.Status.CANCELLED
    m.save(update_fields=["status", "updated_at"])
    if not was_confirmed:
        return 0
    return sum(_send(reg, "Business Connect : rendez-vous annulé",
                     f"Le rendez-vous suivant est annulé et ce créneau est libéré :\n{meeting_line(m, reg)}\n\n"
                     "Si un autre rendez-vous vous est attribué, vous recevrez un message distinct.")
               for reg in (m.first, m.second))


def send_agenda(reg):
    """Agenda individuel : uniquement les rendez-vous confirmés."""
    confirmed = list(active_meetings(reg, (Meeting.Status.CONFIRMED,)))
    if not confirmed:
        raise ValidationError("Aucun rendez-vous confirmé pour ce participant.")
    lines = "\n".join(f"- {meeting_line(m, reg)}" for m in confirmed)
    return _send(reg, "Votre agenda Business Connect",
                 f"Voici votre agenda Business Connect (rendez-vous confirmés) :\n{lines}\n\n"
                 "Tout changement vous sera signalé par un message distinct.")


def public_meetings(reg):
    """Rendez-vous confirmés, pour l'espace de suivi de la personne."""
    return [meeting_line(m, reg) for m in active_meetings(reg, (Meeting.Status.CONFIRMED,))]


def board():
    """Tableau de la Coordination : créneaux, participants, rendez-vous et chevauchements."""
    from apps.core import dossiers
    slots = list(Slot.objects.all())
    regs = list(Registration.objects.exclude(status__in=["rejected", "cancelled"]).prefetch_related("slots").order_by("participant_name"))
    meetings = list(Meeting.objects.exclude(status=Meeting.Status.CANCELLED).select_related("slot", "first", "second"))
    count = {}
    for m in meetings:
        for pid in (m.first_id, m.second_id):
            count[pid] = count.get(pid, 0) + 1
    return {
        "slots": [{"id": s.pk, "label": str(s), "published": s.is_published} for s in slots],
        "participants": [{"id": r.pk, "reference": dossiers.reference(r), "name": r.participant_name, "organization": r.organization,
                          "job_title": r.job_title, "offers": r.what_offers, "needs": r.what_needs, "objective": r.objective,
                          "slots": [s.pk for s in r.slots.all()], "days": r.days, "status": r.get_status_display(),
                          "meetings": count.get(r.pk, 0)} for r in regs],
        "meetings": [{"id": m.pk, "first": m.first_id, "second": m.second_id, "first_name": m.first.participant_name,
                      "second_name": m.second.participant_name, "slot": m.slot_id, "slot_label": str(m.slot), "table": m.table,
                      "status": m.status, "status_label": m.get_status_display(), "conflicts": m.conflicts()} for m in meetings],
    }

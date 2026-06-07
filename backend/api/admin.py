from django.contrib import admin
from .models import Alerte, Bloc, Document, Litige, Proprietaire, Terrain, Transaction


admin.site.register(Proprietaire)
admin.site.register(Terrain)
admin.site.register(Transaction)
admin.site.register(Litige)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['terrain', 'type_document', 'fichier', 'date_upload']
    list_filter = ['type_document']
    date_hierarchy = 'date_upload'


@admin.register(Alerte)
class AlerteAdmin(admin.ModelAdmin):
    list_display  = ['date', 'niveau', 'type_alerte', 'terrain', 'description_courte']
    list_filter   = ['niveau', 'type_alerte']
    readonly_fields = ['date', 'terrain', 'type_alerte', 'description', 'niveau']
    date_hierarchy = 'date'

    @admin.display(description='Description')
    def description_courte(self, obj):
        return obj.description[:80] + ('…' if len(obj.description) > 80 else '')


@admin.register(Bloc)
class BlocAdmin(admin.ModelAdmin):
    list_display = ['index', 'timestamp', 'hash_court', 'previous_hash_court']
    readonly_fields = ['index', 'timestamp', 'data', 'hash', 'previous_hash']

    @admin.display(description='Hash')
    def hash_court(self, obj):
        return f"{obj.hash[:16]}…"

    @admin.display(description='Previous hash')
    def previous_hash_court(self, obj):
        return f"{obj.previous_hash[:16]}…"

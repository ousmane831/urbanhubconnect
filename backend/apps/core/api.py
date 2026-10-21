from rest_framework import serializers

class TaxonomySerializer(serializers.Serializer):
id = serializers.IntegerField(read_only=True)
name = serializers.CharField(read_only=True)
slug = serializers.CharField(read_only=True)

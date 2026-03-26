#!/usr/bin/env python3
"""
LLM Gateway Test Script
Testet alle LLM Provider (OpenAI, Kimi, DeepSeek)
Phase 3: L4-01 bis L4-04
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

from app.db import init_database, close_database
from app.llm import llm_gateway, config_manager, LLMProvider, ChatCompletionRequest, ChatMessage


async def test_llm_providers():
    """Testet alle verfügbaren LLM Provider"""
    print("=" * 60)
    print("LLM Gateway Test - Phase 3")
    print("=" * 60)
    print()
    
    # Initialisiere Datenbank (nicht unbedingt nötig für LLM, aber für Konsistenz)
    print("🔌 Initialisiere Datenbank...")
    try:
        await init_database()
    except Exception as e:
        print(f"⚠️  Datenbank-Initialisierung fehlgeschlagen: {e}")
        print("   Fahre fort ohne Datenbank...")
    print()
    
    # Lade Konfigurationen
    print("📋 Lade LLM Konfigurationen...")
    configs = config_manager.load_configs_from_env()
    
    if not configs:
        print("❌ Keine LLM Provider konfiguriert!")
        print("💡 Füge API Keys zur .env Datei hinzu:")
        print("   OPENAI_API_KEY=<dein_key>")
        print("   KIMI_API_KEY=<dein_key>")
        print("   DEEPSEEK_API_KEY=<dein_key>")
        print()
        await close_database()
        return False
    
    print(f"✅ {len(configs)} Provider-Konfigurationen geladen:")
    for config in configs:
        print(f"   - {config.provider.value}: {config.model}")
    print()
    
    # Initialisiere Gateway
    print("🚀 Initialisiere LLM Gateway...")
    result = await llm_gateway.initialize(configs)
    print(f"   Status: {result['status']}")
    print(f"   Initialisiert: {result['initialized']}/{result['total_providers']}")
    if result['errors']:
        for error in result['errors']:
            print(f"   ⚠️  Fehler: {error}")
    print()
    
    if result['initialized'] == 0:
        print("❌ Keine Provider konnten initialisiert werden!")
        await close_database()
        return False
    
    # Teste jeden Provider
    print("🧪 Teste Provider...\n")
    
    test_prompt = "Was ist 2+2? Antworte nur mit dem Ergebnis."
    
    for provider_enum in llm_gateway.providers.keys():
        try:
            print(f"📌 Teste {provider_enum.value}...")
            
            # Erstelle Test-Request
            request = ChatCompletionRequest(
                messages=[
                    ChatMessage(role="user", content=test_prompt)
                ],
                model=llm_gateway.providers[provider_enum].config.model,
                temperature=0.0,
                max_tokens=50
            )
            
            # Führe Completion aus
            response = await llm_gateway.chat_completion(
                request=request,
                preferred_provider=provider_enum,
                enable_fallback=False
            )
            
            # Analysiere Antwort
            if response.choices and len(response.choices) > 0:
                content = response.choices[0]["message"]["content"]
                print(f"   ✅ Erfolg! Antwort: {content[:50]}...")
                
                # Zeige Token Usage
                if response.usage:
                    prompt_tokens = response.usage.get("prompt_tokens", 0)
                    completion_tokens = response.usage.get("completion_tokens", 0)
                    total_tokens = response.usage.get("total_tokens", 0)
                    print(f"   📊 Tokens: {prompt_tokens} in, {completion_tokens} out, {total_tokens} total")
            else:
                print(f"   ⚠️  Keine Antwort erhalten")
            
            print()
            
        except Exception as e:
            print(f"   ❌ Fehler: {e}")
            print()
    
    # Verwendungsstatistiken
    print("📈 Verwendungsstatistiken:")
    stats = llm_gateway.get_usage_stats()
    print(f"   Gesamte Requests: {stats['total']['requests']}")
    print(f"   Gesamte Input Tokens: {stats['total']['input_tokens']}")
    print(f"   Gesamte Output Tokens: {stats['total']['output_tokens']}")
    print(f"   Gesamtkosten: ${stats['total']['cost']:.4f}")
    print()
    
    for provider, provider_stats in stats['by_provider'].items():
        if provider_stats['requests'] > 0:
            print(f"   {provider}:")
            print(f"     Requests: {provider_stats['requests']}")
            print(f"     Tokens: {provider_stats['input_tokens']} in, {provider_stats['output_tokens']} out")
            print(f"     Kosten: ${provider_stats['cost']:.4f}")
    print()
    
    print("=" * 60)
    print("✅ Alle Tests abgeschlossen!")
    print("=" * 60)
    
    # Datenbank schließen
    await close_database()
    return True


async def test_streaming():
    """Testet Streaming-Funktionalität"""
    print("\n" + "=" * 60)
    print("Streaming Test")
    print("=" * 60)
    print()
    
    if not llm_gateway.providers:
        print("❌ Keine Provider initialisiert")
        return
    
    # Nimm ersten verfügbaren Provider
    provider = list(llm_gateway.providers.keys())[0]
    print(f"📝 Teste Streaming mit {provider.value}...")
    print()
    
    request = ChatCompletionRequest(
        messages=[
            ChatMessage(role="user", content="Erzähle mir eine kurze Geschichte über einen Roboter.")
        ],
        model=llm_gateway.providers[provider].config.model,
        temperature=0.7,
        max_tokens=200,
        stream=True
    )
    
    try:
        print("🔄 Streaming...\n")
        provider_instance = llm_gateway.providers[provider]
        
        chunk_count = 0
        async for chunk in provider_instance.chat_completion_stream(request):
            print(chunk, end="", flush=True)
            chunk_count += 1
        
        print(f"\n\n✅ Stream abgeschlossen ({chunk_count} chunks)")
        
    except Exception as e:
        print(f"\n❌ Streaming Fehler: {e}")
    
    print()


if __name__ == "__main__":
    # Führe Tests aus
    success = asyncio.run(test_llm_providers())
    
    if success:
        # Führe Streaming-Test aus
        asyncio.run(test_streaming())
        print("\n🎉 Alle LLM-Tests erfolgreich abgeschlossen!")
    else:
        print("\n❌ Tests fehlgeschlagen. Siehe Fehlermeldungen oben.")
        sys.exit(1)
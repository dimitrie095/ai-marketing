"""
LLM Configuration Manager
Laden und Verwalten von LLM Provider-Konfigurationen
"""

from typing import List, Dict, Any, Optional
import os
from app.llm.base import LLMProvider, LLMProviderConfig, DEFAULT_API_URLS
from app.db.models_llm import LLMProvider as LLMProviderModel, LLMConfig, Conversation, Message
import logging

logger = logging.getLogger(__name__)


class LLMConfigManager:
    """
    Verwaltet LLM Konfigurationen
    - Lädt aus Umgebungsvariablen oder Datenbank
    - Speichert Provider-Einstellungen
    - Verwaltet Konversationen und Messages
    """
    
    @staticmethod
    def load_configs_from_env() -> List[LLMProviderConfig]:
        """
        Lädt LLM-Konfigurationen aus Umgebungsvariablen
        
        Returns:
            List von LLMProviderConfig
        """
        configs = []
        
        # OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and openai_key != "your_openai_key":
            configs.append(LLMProviderConfig(
                provider=LLMProvider.OPENAI,
                model="gpt-3.5-turbo",  # Standard-Model
                api_key=openai_key,
                base_url=DEFAULT_API_URLS[LLMProvider.OPENAI],
                is_active=True,
                is_default=True,  # OpenAI als Default
                cost_per_1k_input_tokens=0.0015,  # GPT-3.5 Turbo Preise
                cost_per_1k_output_tokens=0.002
            ))
        
        # Kimi (Moonshot)
        kimi_key = os.getenv("KIMI_API_KEY")
        if kimi_key and kimi_key != "your_kimi_key":
            configs.append(LLMProviderConfig(
                provider=LLMProvider.KIMI,
                model="moonshot-v1-8k",  # Standard-Model
                api_key=kimi_key,
                base_url=DEFAULT_API_URLS[LLMProvider.KIMI],
                is_active=True,
                is_default=False,
                cost_per_1k_input_tokens=0.0008,  # Beispiel-Preise
                cost_per_1k_output_tokens=0.0008
            ))
        
        # DeepSeek
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key and deepseek_key != "your_deepseek_key":
            configs.append(LLMProviderConfig(
                provider=LLMProvider.DEEPSEEK,
                model="deepseek-chat",  # Standard-Model
                api_key=deepseek_key,
                base_url=DEFAULT_API_URLS[LLMProvider.DEEPSEEK],
                is_active=True,
                is_default=False,
                cost_per_1k_input_tokens=0.0007,  # Beispiel-Preise
                cost_per_1k_output_tokens=0.0007
            ))
        
        return configs
    
    @staticmethod
    async def load_configs_from_db() -> List[LLMProviderConfig]:
        """
        Lädt LLM-Konfigurationen aus der Datenbank
        
        Returns:
            List von LLMProviderConfig
        """
        configs = []
        
        try:
            # Lade alle aktiven Configs
            llm_configs = await LLMConfig.find({"is_active": True}).to_list()
            
            for config in llm_configs:
                # Lade Provider-Info
                provider = await LLMProvider.find_one({"id": config.provider_id})
                if not provider:
                    logger.warning(f"Provider {config.provider_id} nicht gefunden")
                    continue
                
                # Konvertiere zu LLMProvider
                provider_enum = LLMProvider(provider.name.lower())
                
                configs.append(LLMProviderConfig(
                    provider=provider_enum,
                    model=config.model_name,
                    api_key=config.api_key_encrypted,  # TODO: Decrypt
                    base_url=config.base_url,
                    max_tokens=config.max_tokens,
                    temperature=config.temperature,
                    is_active=config.is_active,
                    is_default=config.is_default,
                    cost_per_1k_input_tokens=float(config.cost_per_1k_input_tokens),
                    cost_per_1k_output_tokens=float(config.cost_per_1k_output_tokens)
                ))
            
            logger.info(f"✅ {len(configs)} LLM-Konfigurationen aus DB geladen")
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Laden der DB-Konfigurationen: {e}")
        
        return configs
    
    @staticmethod
    async def create_conversation(
        user_id: str,
        title: Optional[str] = None,
        llm_config_id: Optional[int] = None
    ) -> str:
        """
        Erstellt eine neue Konversation
        
        Args:
            user_id: ID des Benutzers
            title: Optionaler Titel
            llm_config_id: LLM-Konfig-ID
            
        Returns:
            Konversations-ID
        """
        try:
            import uuid
            conversation_id = str(uuid.uuid4())
            
            conversation = Conversation(
                id=conversation_id,
                user_id=user_id,
                title=title or "Neue Konversation",
                llm_config_id=llm_config_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            await conversation.save()
            logger.info(f"✅ Konversation erstellt: {conversation_id}")
            return conversation_id
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Erstellen der Konversation: {e}")
            raise
    
    @staticmethod
    async def add_message(
        conversation_id: str,
        role: str,
        content: str,
        tokens_used: Optional[int] = None,
        cost: Optional[float] = None
    ) -> str:
        """
        Fügt eine Nachricht zu einer Konversation hinzu
        
        Args:
            conversation_id: ID der Konversation
            role: Rolle (user/assistant)
            content: Nachrichten-Inhalt
            tokens_used: Anzahl der Tokens
            cost: Kosten für diese Nachricht
            
        Returns:
            Nachrichten-ID
        """
        try:
            import uuid
            message_id = str(uuid.uuid4())
            
            message = Message(
                id=message_id,
                conversation_id=conversation_id,
                role=role,
                content=content,
                tokens_used=tokens_used,
                cost=cost,
                created_at=datetime.utcnow()
            )
            
            await message.save()
            
            # Aktualisiere Konversation
            await Conversation.find_one({"id": conversation_id}).update({
                "$set": {"updated_at": datetime.utcnow()}
            })
            
            logger.debug(f"✅ Nachricht hinzugefügt zu Konversation: {conversation_id}")
            return message_id
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Hinzufügen der Nachricht: {e}")
            raise
    
    @staticmethod
    async def get_conversation_history(conversation_id: str) -> List[Dict[str, Any]]:
        """
        Lädt den Verlauf einer Konversation
        
        Args:
            conversation_id: ID der Konversation
            
        Returns:
            List von Nachrichten
        """
        try:
            messages = await Message.find({
                "conversation_id": conversation_id
            }).sort("created_at").to_list()
            
            return [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "tokens_used": msg.tokens_used,
                    "cost": msg.cost,
                    "created_at": msg.created_at
                }
                for msg in messages
            ]
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Laden des Konversationsverlaufs: {e}")
            return []


# Globaler Config-Manager
config_manager = LLMConfigManager()
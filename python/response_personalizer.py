"""
Response Personalizer - Adapts AI responses based on customer profiles.

Usage:
    python response_personalizer.py
"""
import json
import random
import sys


class ResponsePersonalizer:
    def __init__(self):
        self.personality_matrix = {
            "young_professional": {
                "language_style": "casual_direct",
                "payment_emphasis": "convenience",
                "urgency_level": "medium",
                "discount_approach": "gradual_concessions",
            },
            "middle_aged": {
                "language_style": "respectful_formal",
                "payment_emphasis": "family_responsibility",
                "urgency_level": "medium",
                "discount_approach": "fair_consideration",
            },
            "senior_citizen": {
                "language_style": "patient_respectful",
                "payment_emphasis": "legacy_planning",
                "urgency_level": "low",
                "discount_approach": "generous_accommodation",
            },
            "financial_stress": {
                "language_style": "empathetic_supportive",
                "payment_emphasis": "flexibility",
                "urgency_level": "very_low",
                "discount_approach": "significant_concessions",
            },
        }

        self.greeting_templates = {
            "young_professional": [
                "Oi {name}! Tudo bem? Vi que tem uma pendência de R$ {amount} no consórcio. Bora resolver isso rapidinho?",
                "E aí {name}! Passando pra falar sobre sua parcela de R$ {amount}. Tenho condições especiais!",
            ],
            "middle_aged": [
                "Olá {name}! Vi que você tem uma pendência no seu consórcio de R$ {amount}. Posso te ajudar?",
                "Bom dia {name}! Vim conversar sobre sua pendência do consórcio. Temos opções que podem te ajudar!",
            ],
            "senior_citizen": [
                "Bom dia {name}! Gostaria de conversar sobre sua parcela do consórcio. Temos condições especiais.",
                "Olá {name}! Espero que esteja bem. Gostaria de apresentar opções flexíveis de pagamento.",
            ],
            "financial_stress": [
                "Olá {name}, entendo que momentos difíceis acontecem. Estou aqui pra ajudar. Sem pressão.",
                "Oi {name}! Sei que a situação pode estar complicada. Temos opções bem flexíveis.",
            ],
        }

    def determine_cluster(self, profile, intent_scores=None):
        age = profile.get("age", 35)
        income_level = profile.get("income_level", profile.get("income_bracket", "middle"))
        financial_capacity = 0.5
        if intent_scores:
            financial_capacity = intent_scores.get("financial_capacity", 0.5)

        if financial_capacity < 0.3:
            return "financial_stress"
        if age < 35 and income_level in ("high", "middle"):
            return "young_professional"
        if age >= 55:
            return "senior_citizen"
        return "middle_aged"

    def personalize_response(self, base_response, customer_profile, intent_scores=None):
        cluster = self.determine_cluster(customer_profile, intent_scores)
        personality = self.personality_matrix[cluster]

        return {
            "message": base_response,
            "personality_cluster": cluster,
            "personality_settings": personality,
        }

    def generate_greeting(self, customer_name, overdue_amount, profile):
        cluster = self.determine_cluster(profile)
        templates = self.greeting_templates[cluster]
        template = random.choice(templates)
        first_name = customer_name.split()[0] if customer_name else "Cliente"
        amount = f"{overdue_amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return template.format(name=first_name, amount=amount)


if __name__ == "__main__":
    personalizer = ResponsePersonalizer()

    # Demo with different profiles
    profiles = [
        {"name": "Lucas Mendes", "age": 28, "income_level": "high", "amount": 1500.00},
        {"name": "Roberto Silva", "age": 62, "income_level": "middle", "amount": 3200.50},
        {"name": "Ana Paula", "age": 40, "income_level": "low", "amount": 5000.00},
    ]

    for p in profiles:
        profile = {"age": p["age"], "income_level": p["income_level"]}
        cluster = personalizer.determine_cluster(profile)
        greeting = personalizer.generate_greeting(p["name"], p["amount"], profile)
        print(f"\nProfile: {p['name']} (age={p['age']}, income={p['income_level']})")
        print(f"Cluster: {cluster}")
        print(f"Greeting: {greeting}")

    print(json.dumps(personalizer.personality_matrix, indent=2, ensure_ascii=False))

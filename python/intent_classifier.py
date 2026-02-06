"""
Intent Classifier - BERT-based + business rules for customer intent detection.

For the POC, uses regex-based classification.
In production, would use transformers pipeline with fine-tuned BERT model.

Usage:
    python intent_classifier.py "posso pagar, como faço?"
"""
import re
import sys
import json


class IntentClassifier:
    def __init__(self):
        self.intent_categories = {
            "payment_willingness": {
                "high": ["posso pagar", "tenho interesse", "como faço", "quero pagar", "vou pagar"],
                "medium": ["mais tarde", "verifico", "chamo depois", "preciso pensar"],
                "low": ["não tenho dinheiro", "impossível", "não vou pagar", "sem condição"],
            },
            "emotional_state": {
                "stressed": ["estou muito apertado", "situação difícil", "perdi emprego", "problema"],
                "cooperative": ["podemos resolver", "entendo a situação", "ajuda", "quero resolver"],
                "resistant": ["não quero falar", "me deixe em paz", "não interessa"],
            },
            "financial_capacity": {
                "high": ["tenho dinheiro", "posso pagar tudo", "já resolvo", "à vista"],
                "medium": ["pequeno valor", "consigo alguma coisa", "parte do valor", "parcela"],
                "low": ["zero dinheiro", "não tenho nada", "situação crítica", "desempregado"],
            },
        }

    def classify_intent(self, message, conversation_history=""):
        full_context = f"{conversation_history}\nCurrent: {message}".lower()

        rule_scores = self._apply_business_rules(full_context)
        final_scores = {
            "payment_willingness": rule_scores["willingness"],
            "emotional_state": rule_scores["emotion"],
            "financial_capacity": rule_scores["capacity"],
        }

        strategy = self._generate_response_strategy(final_scores)

        return {
            "scores": final_scores,
            "strategy": strategy,
            "confidence": self._calculate_confidence(final_scores),
        }

    def _apply_business_rules(self, message):
        patterns = {
            "willingness": {
                r"(posso|pago|tenho.*dinheiro|interessado|quero pagar|como faço)": 0.8,
                r"(verifico|chamo depois|mais tarde|preciso pensar)": 0.5,
                r"(não.*dinheiro|impossível|não.*pago|sem condição)": 0.2,
            },
            "emotion": {
                r"(aperto|difícil|perdi.*emprego|problema|desespero)": 0.3,
                r"(entendo|ajuda|podemos.*resolver|quero resolver)": 0.8,
                r"(não.*quero|deixe.*paz|não.*interessa)": 0.2,
            },
            "capacity": {
                r"(tenho.*dinheiro|posso.*tudo|já resolvo|à vista)": 0.8,
                r"(pequeno valor|alguma coisa|parcela|dividir)": 0.5,
                r"(zero|não tenho nada|crítica|desempregado|sem renda)": 0.2,
            },
        }

        scores = {"willingness": 0.5, "emotion": 0.5, "capacity": 0.5}

        for category, pattern_dict in patterns.items():
            for pattern, score in pattern_dict.items():
                if re.search(pattern, message):
                    scores[category] = score
                    break

        return scores

    def _generate_response_strategy(self, scores):
        willingness = scores.get("payment_willingness", 0.5)
        capacity = scores.get("financial_capacity", 0.5)
        emotion = scores.get("emotional_state", 0.5)

        if willingness >= 0.7 and capacity >= 0.7:
            return "close_deal"
        if willingness >= 0.7 and capacity < 0.5:
            return "offer_installments"
        if emotion <= 0.3:
            return "empathetic_support"
        if willingness <= 0.3:
            return "build_rapport"
        return "present_options"

    def _calculate_confidence(self, scores):
        deviations = [abs(v - 0.5) for v in scores.values()]
        avg_deviation = sum(deviations) / len(deviations) if deviations else 0
        return round(0.5 + avg_deviation, 2)


if __name__ == "__main__":
    classifier = IntentClassifier()
    message = sys.argv[1] if len(sys.argv) > 1 else "posso pagar, como faço?"
    history = sys.argv[2] if len(sys.argv) > 2 else ""

    result = classifier.classify_intent(message, history)
    print(json.dumps(result, indent=2, ensure_ascii=False))

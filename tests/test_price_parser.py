"""
가격 파싱 로직 테스트
"""
import pytest


def parse_price_to_won(price_str: str) -> int:
    """
    가격 문자열을 원 단위로 변환
    예: "3억 5,000" -> 350000000
    """
    if not price_str or price_str == "-":
        return 0

    clean_str = price_str.replace(" ", "").replace(",", "")

    eok = 0
    if "억" in clean_str:
        parts = clean_str.split("억")
        eok = int(parts[0]) if parts[0] else 0
        clean_str = parts[1] if len(parts) > 1 else ""

    man = 0
    if clean_str:
        man = int(clean_str) if clean_str.isdigit() else 0

    return eok * 100000000 + man * 10000


class TestPriceParser:
    """가격 파싱 테스트"""

    def test_parse_eok_only(self):
        """억 단위만 있는 경우"""
        assert parse_price_to_won("3억") == 300000000
        assert parse_price_to_won("10억") == 1000000000

    def test_parse_man_only(self):
        """만원 단위만 있는 경우"""
        assert parse_price_to_won("5000") == 50000000
        assert parse_price_to_won("1,000") == 10000000

    def test_parse_eok_and_man(self):
        """억과 만원 모두 있는 경우"""
        assert parse_price_to_won("3억 5,000") == 350000000
        assert parse_price_to_won("10억 2,500") == 1025000000

    def test_parse_with_spaces(self):
        """공백이 포함된 경우"""
        assert parse_price_to_won("3억 5,000") == 350000000
        assert parse_price_to_won("3억5,000") == 350000000

    def test_parse_empty_or_dash(self):
        """빈 문자열이나 대시인 경우"""
        assert parse_price_to_won("") == 0
        assert parse_price_to_won("-") == 0

    def test_parse_with_comma(self):
        """쉼표가 포함된 경우"""
        assert parse_price_to_won("1,000") == 10000000
        assert parse_price_to_won("10,000") == 100000000

    @pytest.mark.parametrize(
        "input_str,expected",
        [
            ("1억", 100000000),
            ("2억 5,000", 250000000),
            ("500", 5000000),
            ("12억 3,456", 123456000),
        ],
    )
    def test_various_formats(self, input_str, expected):
        """다양한 형식 테스트"""
        assert parse_price_to_won(input_str) == expected


class TestPriceComparison:
    """가격 비교 테스트"""

    def test_price_comparison(self):
        """파싱된 가격으로 비교 가능"""
        price1 = parse_price_to_won("3억")
        price2 = parse_price_to_won("3억 5,000")
        price3 = parse_price_to_won("2억 9,000")

        assert price3 < price1 < price2
        assert price2 > price1
        assert price1 == 300000000

    def test_sort_prices(self):
        """가격 정렬 가능"""
        prices = ["3억 5,000", "2억", "5억", "2억 9,000"]
        parsed = [parse_price_to_won(p) for p in prices]
        sorted_prices = sorted(parsed)

        assert sorted_prices == [
            200000000,  # 2억
            290000000,  # 2억 9,000
            350000000,  # 3억 5,000
            500000000,  # 5억
        ]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


from decimal import Decimal

def test_mg_to_cost():
    dose_mg=Decimal("500")
    price_per_kg=Decimal("500")
    cost=dose_mg*(price_per_kg/Decimal("1000000"))
    assert cost==Decimal("0.2500")

def test_waste():
    ordered=1500000
    waste=Decimal("5")
    planned=int(Decimal(ordered)*(Decimal("1")+waste/Decimal("100")))
    assert planned==1575000

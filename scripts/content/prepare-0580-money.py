"""Generate original Cambridge 0580 Money lessons, short checks and written tasks."""

from decimal import Decimal, ROUND_HALF_UP, localcontext
from fractions import Fraction
from hashlib import sha256
from html import escape
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
COURSE = "maths4u-0580"
PREFIX = "igcse-0580-money-"
DATE = "2026-11-22"


def p(text):
    return f"<p>{text}</p>"


def math(tex):
    return r"\(" + escape(str(tex), quote=False) + r"\)"


def pounds(amount):
    return f"£{amount:.2f}"


def euros(amount):
    return f"€{amount:.2f}"


def precise(value):
    value = Fraction(value)
    with localcontext() as context:
        context.prec = 48
        return Decimal(value.numerator) / Decimal(value.denominator)


def cents(value):
    return precise(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def rate_text(value):
    value = precise(value)
    return math(f"{value:f}".rstrip("0").rstrip(".") if value % 1 else int(value))


def amount(title, prompt, result, steps, method_mark, hint, wrong=(), currency="GBP"):
    display = pounds if currency == "GBP" else euros
    expected = cents(result)
    retry = {}
    for value, feedback in wrong:
        value = cents(value)
        if value >= 0 and value != expected:
            retry[str(value)] = p(feedback)
    unit = "pounds" if currency == "GBP" else "euros"
    return {
        "title": title, "prompt": p(prompt), "field": dict(key="answer", label=f"Amount in {unit}", type="number", expected=str(expected)),
        "answer": display(expected), "solution": [p(s) for s in steps], "mark": p(method_mark), "hint": p(hint),
        "retry": [dict(answer=value, feedback=feedback) for value, feedback in retry.items()],
    }


def price(seed, base=225, step=7):
    return Fraction(base + step * seed, 100)


def total_cost(seed):
    n, unit, delivery = 2 + seed % 5, price(seed), price(seed, 185, 1)
    result = n * unit + delivery
    return amount("Work out a total with delivery",
        f"A photography club orders {n} mounts at {pounds(cents(unit))} each. Delivery costs {pounds(cents(delivery))} for the whole order. Find the total cost.", result,
        [f"Multiply the price of one mount by {n}. The mounts cost {pounds(cents(n*unit))}.",
         f"Add delivery once. The total is {pounds(cents(result))}."],
        "Multiply the unit price by the number of mounts, then add one delivery charge.",
        "Work out the cost of the mounts first. Delivery is charged once for the order.",
        [(n*unit,"The mounts are correct. Add the fixed delivery charge."), (n*(unit+delivery),"The delivery charge is for the whole order. Add it once."), (unit+delivery,"There is more than one mount. Multiply the unit price by the quantity.")])


def cash_change(seed):
    n, unit, paid = 2 + seed % 4, price(seed, 135, 6), 20 + 10 * (seed//16)
    result = paid - n * unit
    return amount("Find the change from a payment",
        f"A customer pays {pounds(cents(paid))} in cash for {n} exercise books costing {pounds(cents(unit))} each. How much change should the customer receive?", result,
        [f"Multiply {pounds(cents(unit))} by {n} to find the total spent, {pounds(cents(n*unit))}.",
         f"Subtract that total from the cash handed over. The change is {pounds(cents(result))}."],
        "Subtract the full cost of the books from the cash payment.",
        "Change is the payment minus the total cost. Calculate the whole purchase before subtracting.",
        [(n*unit,"That is the total paid for the books. Subtract it from the cash handed over."), (paid-unit,"Subtract the cost of all the books. You have counted only one."), (paid+n*unit,"Change is what remains after spending. Subtract the cost.")])


def account_balance(seed):
    opening, income, spend, second = [price(seed, base, step) for base,step in ((2810,15),(1495,9),(680,3),(495,2))]
    result = opening + income - spend - second
    return amount("Follow money paid in and out",
        f"A studio has {pounds(cents(opening))} in its cash pot. It receives {pounds(cents(income))}, then pays {pounds(cents(spend))} for tape and {pounds(cents(second))} for labels. How much remains?", result,
        [f"Add money received to the opening amount. The pot now contains {pounds(cents(opening+income))}.",
         f"The two payments cost {pounds(cents(spend+second))}. Subtract both to give {pounds(cents(result))}."],
        "Add the studio receipt and subtract both payments from the opening amount.",
        "Sort the amounts into money coming in and money being paid out.",
        [(opening-income+spend+second,"The studio receives the income. Add it and subtract what the studio pays."), (opening+income-spend,"There are two payments. Subtract the cost of the labels too."), (income-spend-second,"The opening amount was already in the pot. Include it.")])


def maximum_order(seed):
    n, unit, delivery, left = 3 + seed % 5, price(seed, 285, 6), price(seed, 190, 2), price(seed, 37, 1)
    budget = n * unit + delivery + left
    return amount("Find what is left after the largest order",
        f"A craft club can spend {pounds(cents(budget))} on identical reels. One reel costs {pounds(cents(unit))}. The shop charges {pounds(cents(delivery))} delivery once. How much of the budget remains after buying as many whole reels as possible?", left,
        [f"Set aside delivery. The amount available for reels is {pounds(cents(budget-delivery))}.",
         f"Divide by the price per reel and take the whole number that fits. {n} reels cost {pounds(cents(n*unit))}.",
         f"Subtract that cost and the delivery charge from {pounds(cents(budget))}. This leaves {pounds(cents(left))}."],
        "Deduct the delivery charge, divide by the unit price, then use the greatest affordable whole number of reels.",
        "Remove the fixed delivery charge from the budget before finding how many reels you can buy.",
        [(left+delivery,"You still need to pay the fixed delivery charge."), (n*unit+delivery,"That is the amount spent. The question asks how much remains.")])


def quoted_rate(seed):
    return Fraction(106 + seed % 53, 100)


def to_euros(seed):
    gbp, rate = 34 + 3 * seed, quoted_rate(seed)
    result = gbp * rate
    return amount("Exchange pounds for euros",
        f"At a counter, £1 buys {euros(cents(rate))}. An organiser changes £{gbp} into euros. How many euros does the organiser receive?", result,
        [f"For every pound the organiser receives {euros(cents(rate))}. Multiply the pounds by {rate_text(rate)}.",
         f"{math(fr'{gbp}\times {precise(rate)}')} gives {euros(cents(result))}."],
        "Multiply the number of pounds by the given euros per pound.",
        "Find the value in euros of one pound, then scale to the pounds given.",
        [(gbp/rate,"The rate gives euros for one pound. Multiply when you start with pounds."), (gbp+rate,"The number of euros for one pound is a multiplier, not an added charge.")], "EUR")


def to_pounds(seed):
    eur, rate = 38 + 4 * seed, quoted_rate(seed)
    result = eur / rate
    return amount("Exchange euros for pounds",
        f"A collector has €{eur}. Use the exchange rate £1 = {euros(cents(rate))}. Calculate the value in pounds to the nearest penny.", result,
        [f"One pound uses {euros(cents(rate))}. Divide the euros by euros per pound.",
         f"The calculation is {math(fr'{eur}\div {precise(rate)}')}. Round that result to get {pounds(cents(result))}."],
        "Divide the amount in euros by the number of euros per pound.",
        "Ask how many groups of the quoted euro amount are in the given total.",
        [(eur*rate,"This starts with euros. To undo the euros-per-pound multiplication, divide by the rate."), (eur-rate,"Use the quote as a conversion factor. Divide rather than subtracting the quote."), (round(result),"The question asks for the nearest penny. Return to the full calculation and round to two decimal places.")])


def from_euros_quote(seed):
    euros_held = 21+3*seed
    rate = Fraction(74+seed%18,100)
    result = euros_held*rate
    return amount("Use a quote written per euro",
        f"A bureau quotes €1 = {pounds(cents(rate))}. An exhibitor exchanges €{euros_held} for pounds. How many pounds does the exhibitor receive?", result,
        [f"This quote starts with one euro. So each euro buys {pounds(cents(rate))}.",
         f"Multiply the euros by {rate_text(rate)}. The exhibitor receives {pounds(cents(result))}."],
        "Multiply the euros by the pounds per euro shown in the quote.",
        "Begin from the quote as written. Each euro buys the given amount in pounds.",
        [(euros_held/rate,"The rate is pounds per euro, so multiply the euros. Dividing would undo that conversion.")])


def fixed_exchange_fee(seed):
    gbp, fee, rate = 55+seed*2, price(seed, 195, 1), quoted_rate(seed)
    result = (gbp-fee) * rate
    return amount("Deduct the fee before exchanging",
        f"A customer hands over £{gbp} to buy euros. The bureau first keeps a fee of {pounds(cents(fee))}. It converts the remaining pounds at £1 = {euros(cents(rate))}. How many euros does the customer receive to the nearest cent?", result,
        [f"Take the fee from the pounds. That leaves {pounds(cents(gbp-fee))} for the exchange.",
         f"Multiply this by {rate_text(rate)} euros per pound. The customer receives {euros(cents(result))} after rounding."],
        "Subtract the fee in pounds first, then multiply by euros per pound.",
        "The fee is in pounds. Deduct it while the amount is still in pounds.",
        [(gbp*rate-fee,"Subtracting the pound fee after conversion treats the fee as euros."), (gbp*rate,"The bureau keeps its fee first. Convert the balance in pounds only."), ((gbp-fee)/rate,"You took the fee in the correct currency. Multiply to find the euros received.")], "EUR")


def compare_stores(seed):
    gbp, rate = price(seed, 1940, 25), quoted_rate(seed)
    eur = cents(gbp*rate)+Decimal(3+(seed%8))/10 if seed%2 else cents(gbp*rate)-Decimal(3+(seed%8))/10
    converted = Fraction(eur) / rate
    result = abs(gbp-converted)
    cheaper = "The price in euros" if converted<gbp else "The price in pounds"
    return amount("Compare two prices in one currency",
        f"A case costs {pounds(cents(gbp))} from one seller and {euros(eur)} from another. Use £1 = {euros(cents(rate))} and ignore fees. How much less does the cheaper case cost, in pounds to the nearest penny?", result,
        [f"Convert {euros(eur)} to pounds by dividing by {rate_text(rate)}. Keep the full value for the subtraction.",
         f"{cheaper} is cheaper. Subtract the lower value in pounds from the higher one. The difference is {pounds(cents(result))}."],
        "Convert the euro price to pounds and compare using the two pound amounts.",
        "Before subtracting, express both prices in pounds.",
        [(abs(gbp-Fraction(eur)),"One price is in pounds and one is in euros. Convert to the same currency first."), (converted,"That is the euro price in pounds. Subtract to find the difference.")])


def interest_values(seed):
    principal, percentage, years = 320 + 25*seed, Fraction(24 + seed%59,10), 2 + seed%5
    return principal, percentage, years


def simple_earned(seed):
    principal, percentage, years = interest_values(seed)
    annual = principal * percentage / 100
    result = annual * years
    return amount("Calculate simple interest earned",
        f"A school association saves £{principal} at {rate_text(percentage)}% simple interest per year. Find the interest it earns in {years} years to the nearest penny.", result,
        [f"Interest for one year is {rate_text(percentage)}% of £{principal}, which is {rate_text(annual)} pounds. Keep this value for the next step.",
         f"Multiply that same annual amount by {years}. The interest is {pounds(cents(result))}."],
        "Find one year's interest on the starting amount and multiply by the number of years.",
        "Work out interest on the original deposit. The same amount is earned each year.",
        [(principal+result,"That is the balance. Report only the interest."), (annual,"That is one year of interest. Multiply by the full number of years."), (principal*((1+percentage/100)**years-1),"The account pays simple interest. It pays the same amount each year.")])


def simple_balance(seed):
    principal, percentage, years = interest_values(seed)
    annual = principal * percentage / 100
    result = principal + annual * years
    return amount("Find the final balance with simple interest",
        f"A community workshop deposits £{principal} at {rate_text(percentage)}% simple interest per year. Calculate the balance after {years} years to the nearest penny.", result,
        [f"The deposit earns {rate_text(annual)} pounds per year. In {years} years it earns {rate_text(annual*years)} pounds.",
         f"Add the whole amount earned to the original deposit. The balance is {pounds(cents(result))}."],
        "Calculate the simple interest for the full term and add it to the principal.",
        "The balance includes the starting amount and the interest.",
        [(annual*years,"You found the interest. Add it to the principal for the balance."), (principal+annual,"This balance is for one year. Include the full term."), (principal*(1+percentage/100)**years,"The account pays simple interest. Apply the rate to the starting amount each year.")])


def partial_year(seed):
    principal, percentage, _ = interest_values(seed)
    months = (3,6,9,15,18,21)[seed%6]
    annual = principal * percentage / 100
    result = annual * Fraction(months,12)
    time = math(fr'\frac{{{months}}}{{12}}')
    return amount("Allow for months in a simple-interest term",
        f"A school club deposits £{principal} for {months} months. It earns {rate_text(percentage)}% simple interest per year, proportionally for a part of a year. Find the interest earned to the nearest penny.", result,
        [f"The time in years is {time}. The rate is quoted per year.",
         f"Multiply the full annual interest of {rate_text(annual)} pounds by {time}. The interest is {pounds(cents(result))}."],
        "Use months divided by 12 as the time in the simple-interest calculation.",
        "Write the time in years so it matches the annual rate.",
        [(annual*months,"This treats the months as years. Divide the time in months by 12."), (annual,"The term here is different from a whole year. Use the stated time."), (principal+result,"Report the interest only, without the original deposit.")])


def missing_principal(seed):
    principal = (17 + seed) * 100
    percentage = 2 + seed%7
    years = 2 + seed%5
    earned = Fraction(principal*percentage*years,100)
    fraction = math(fr'\frac{{{percentage}}}{{100}}\times {years}')
    return amount("Find the principal from the interest earned",
        f"A repair fund earned {pounds(cents(earned))} of simple interest over {years} years at {percentage}% per year. Find the original amount in the fund.", principal,
        [f"Over {years} years the interest is {fraction}, or {percentage*years}%, of the starting amount.",
         f"Divide the interest by {rate_text(Fraction(percentage*years,100))}. The original amount was {pounds(cents(principal))}."],
        "Divide the interest by the whole-term simple-interest rate as a decimal.",
        "Interest alone is the starting amount times the annual decimal rate times the number of years.",
        [(earned/Fraction(percentage,100),"You used the rate for a single year. The interest given is for the whole term."), (earned/(1+Fraction(percentage*years,100)),"The amount given is interest alone, not an ending balance.")])


def compound_balance(seed):
    principal, percentage, years = interest_values(seed)
    factor = 1 + percentage/100
    result = principal * factor ** years
    expression = math(fr'{principal}\times {precise(factor)}^{{{years}}}')
    return amount("Find a balance with annual compounding",
        f"A library fund saves £{principal} at {rate_text(percentage)}% interest, compounded annually. Calculate its balance after {years} full years to the nearest penny.", result,
        [f"Each year the current balance is multiplied by {rate_text(factor)}.",
         f"Apply that multiplier {years} times. The calculation {expression} gives {pounds(cents(result))} to the nearest penny."],
        "Use the starting amount multiplied by the full annual multiplier raised to the number of years.",
        "Build one multiplier for an increase, then apply it once for each year.",
        [(principal*(1+years*percentage/100),"That adds an equal amount each year. For compound interest, multiply the current balance each year."), (principal*factor,"The multiplier is correct. Apply it once for every year."), (result-principal,"You reported the interest. Include the starting balance.")])


def compound_earned(seed):
    principal, percentage, years = interest_values(seed)
    factor = 1 + percentage/100
    result = principal*(factor**years-1)
    total = result+principal
    return amount("Find just the interest from an annual balance",
        f"A tool library puts £{principal} into an account paying {rate_text(percentage)}% compound interest per year. How much interest is earned in {years} full years? Give the answer to the nearest penny.", result,
        [f"The annual multiplier is {rate_text(factor)}. Multiply the deposit by this multiplier raised to the power {years}.",
         f"The balance rounds to {pounds(cents(total))}. Subtract the original deposit from the full balance and round the interest to {pounds(cents(result))}."],
        "Calculate the compound ending balance, then subtract the original deposit.",
        "Use the balance formula first. Take away what was there at the start.",
        [(total,"This is the full balance. Subtract the starting deposit to find interest earned."), (principal*percentage*years/100,"This uses simple interest. The balance grows before interest is calculated again.")])


def interest_difference(seed):
    principal, percentage, years = interest_values(seed)
    factor = 1 + percentage/100
    simple = principal*(1+percentage*years/100)
    compound = principal*(factor**years)
    result = compound-simple
    return amount("Compare simple and compound interest",
        f"Two accounts each start with £{principal} and both pay {rate_text(percentage)}% per year. One pays simple interest. The other compounds annually. How much higher is the compound balance after {years} full years? Give the difference to the nearest penny.", result,
        [f"For simple interest add the same yearly amount to the starting balance. The simple balance rounds to {pounds(cents(simple))}.",
         f"For compound interest use the annual multiplier {rate_text(factor)} with exponent {years}. The compound balance rounds to {pounds(cents(compound))}.",
         f"Subtract the simple balance from the full compound balance, then round. The difference is {pounds(cents(result))}."],
        "Calculate a simple-interest balance and a compound-interest balance, then subtract.",
        "Use the same starting amount and rate in both calculations, but a different method for each.",
        [(compound-principal,"That is all the compound interest earned. Subtract the simple interest earned to find the difference."), (compound,"That is the compound balance. Subtract the simple balance."), (0,"The annual rates match, but the compound account earns interest on previous interest after year one.")])


def two_annual_rates(seed):
    principal=720+50*seed
    simple_rate=Fraction(32+seed%6,10)
    years=3+seed%3
    compound_rate=simple_rate-Fraction(1 if seed%2 else 5,10)
    simple=principal*(1+simple_rate*years/100)
    factor=1+compound_rate/100
    compound=principal*factor**years
    higher="simple" if simple>compound else "compound"
    result=abs(simple-compound)
    return amount("Compare accounts with different fixed rates",
        f"A project has £{principal} to save for {years} full years. Account A pays {rate_text(simple_rate)}% simple interest per year. Account B pays {rate_text(compound_rate)}% compounded annually. Find the difference between the balances to the nearest penny.", result,
        [f"Account A earns the same amount each year. Its ending balance rounds to {pounds(cents(simple))}.",
         f"Calculate Account B using the multiplier {rate_text(factor)} a total of {years} times. Its ending balance rounds to {pounds(cents(compound))}.",
         f"The {higher}-interest account has the higher balance. Subtract the lower full value and round the difference to {pounds(cents(result))}."],
        "Apply the stated rate and interest method to each account before finding the difference.",
        "Calculate both ending balances before deciding which one is higher.",
        [(principal*(1+simple_rate/100)**years-simple,"The accounts quote different rates. Use the compound account's own rate."), (compound,"That is the compound account's ending balance. Find how far apart the two balances are."), (simple,"That is the simple account's ending balance. Find how far apart the two balances are.")])


LESSONS = (
    {
        "key": "totals-and-change", "title": "Calculate totals, payments and change",
        "summary": "Use unit prices and fixed charges to find a bill, check change and work with a simple budget.",
        "words": (("Unit price","The cost of one item or one unit."), ("Total","The amount for the whole purchase."),
                  ("Fixed charge","An amount charged once for the order, regardless of the quantity."), ("Change","The money returned after a cash payment.")),
        "figure": "receipt-flow",
        "sections": (
            ("build-a-total", "How do I build a total from a price list?", 7,
             "Start by deciding what the price is for. A price ‘each’ applies to every item. A single fee applies to the order as a whole.",
             "Multiply each unit price by its quantity. Add the item costs and any fixed fee.",
             "Write a line for each cost. For instance, a reader buying three £2.45 notebooks with one £1.80 collection fee writes an item subtotal and a single fee.",
             "A fixed charge is counted once. Multiplying the charge by the quantity makes the total too large.", total_cost,cash_change),
            ("check-money-out", "Which amounts are added and which are subtracted?", 8,
             "A cash pot grows when money comes in. A purchase reduces what is left. A receipt can help you track the running balance.",
             "For change use the cash handed over minus the total cost. For a pot, begin with the opening amount, add receipts and subtract payments.",
             "If the question asks what remains, check your answer against the amount available before you paid. It should be smaller unless money also came in.",
             "Cash paid and goods bought are different amounts. Keep the cash payment separate from the bill until the subtraction for change.", account_balance,cash_change),
            ("fit-the-budget", "How many whole items fit the budget?", 9,
             "Allow for anything you must pay once before working out how many items will fit.",
             "Set aside the fee. Divide what is left by the unit price. Use the greatest affordable whole number. Check the spending with that number.",
             "A quotient of 6.8 means six whole items fit. Work out what six cost and subtract the complete bill from the original budget.",
             "Rounding up can buy an item that the budget cannot cover. Check that one more item would exceed the budget.", maximum_order,account_balance),
        ),
        "tip": "Label the subtotal, the bill and the change in your working. Write two digits after the point for pounds and pence.",
        "checks": ("Have I counted each item and each fixed charge correctly?", "Does the question ask for the cost or for the money left?", "Is the answer in pounds and pence?"),
    },
    {
        "key": "exchange-rates", "title": "Convert between currencies",
        "summary": "Read an exchange quote, choose the operation for each direction and compare prices in a common currency.",
        "words": (("Currency","A unit such as pounds (GBP) or euros (EUR)."), ("Exchange rate","The value of one currency in another."),
                  ("Conversion factor","The number that scales a value from one unit to another."), ("Nearest cent","The nearest hundredth of a euro.")),
        "figure": "exchange-directions",
        "sections": (
            ("from-the-one", "When do I multiply by the rate?", 7,
             "The quote £1 = €1.23 tells you what one pound buys. Check which currency is on the one side of the quote.",
             "Starting from the quoted one-unit currency, multiply by the amount on the other side. For £1 = €1.23, multiply pounds by 1.23 to find euros.",
             "Test your operation on one pound first. It must produce €1.23. Then scale up to the amount in the question.",
             "Write the currency after every value. The number alone cannot tell you which direction the calculation went.", to_euros,from_euros_quote),
            ("back-to-the-one", "How do I go back the other way?", 8,
             "If you already have euros, ask how many groups of the quoted euro amount you can make.",
             "From euros back to pounds, undo the previous multiplication. Divide the euro amount by the euros per pound.",
             "If £1 buys more than €1, the number of pounds will be smaller than the number of euros for the same amount of money. Check the size and write the requested precision.",
             "Turning around in the quote changes the operation. Test it using the two amounts printed in the quote.", to_pounds,to_euros),
            ("fees-and-comparisons", "How do I handle fees and compare prices?", 10,
             "Work out which currency each fee is charged in and when it applies. Express both prices in one currency before deciding which is cheaper.",
             "For a fee deducted from the cash handed over, reduce that amount first. Then convert what remains.",
             "When comparing prices, put both in the currency requested in the question. Subtract the lower full value from the higher full value, then round the difference.",
             "The fee is an amount of money with a unit. Subtract it from an amount in that same currency.", fixed_exchange_fee,compare_stores),
        ),
        "tip": "Write the quote first and label both currencies. Keep calculator digits until the final amount or difference.",
        "checks": ("Which currency appears as one unit in the quote?", "Is my fee in the same currency as the amount I subtract it from?", "Have I compared prices in the same currency?"),
    },
    {
        "key": "simple-interest", "title": "Work with simple interest",
        "summary": "Use the starting deposit and an annual rate to work out simple interest, the ending balance or a missing deposit.",
        "words": (("Principal","The starting amount saved or borrowed."), ("Simple interest","Interest calculated on the principal each time."),
                  ("Per annum","For each year."), ("Final balance","The principal plus all interest for the term.")),
        "figure": "fixed-principal",
        "sections": (
            ("one-year-first", "Why is the interest the same each year?", 7,
             "In a simple-interest account the calculation uses the starting deposit every year. The amount earned in year one is repeated in year two.",
             "Work out one year's interest first. A 3.6% rate means 3.6 out of every 100 pounds of the starting deposit per year.",
             f"For principal {math('P')}, annual rate {math('r')} written as a decimal and time {math('t')} in years, interest is {math('I=Prt')}. Add the principal only if asked for the balance.",
             "A balance and interest earned answer different questions. Use the wording of the final line to decide which to give.", simple_earned,simple_balance),
            ("match-the-time-unit", "How do I use a term given in months?", 8,
             "If the question says simple interest is paid proportionally for part of a year, work with the same time unit as the rate.",
             f"For an annual rate, the time in years is {math(r'\dfrac{\text{months}}{12}')}. For instance, 18 months is {math(r'\frac{18}{12}=1.5')} years.",
             "Multiply one year's interest by the fraction or decimal number of years. Keep the full values until the final answer.",
             "Do not put 18 in the years box for 18 months. Convert it to years first.", partial_year,simple_earned),
            ("find-the-deposit", "How can I recover the starting deposit?", 9,
             "The question can give the interest paid and ask for the starting amount. First label the interest separately from the balance.",
             f"Over the full term, the interest is {math('rt')} times the starting deposit. Use {math(r'P=\dfrac{I}{rt}')} if the question gives the interest itself.",
             "Multiply your proposed deposit by the annual decimal rate and the number of years. You should recover the stated interest.",
             "Dividing by the one-year rate ignores how long the money was there. Use the complete term.", missing_principal,simple_balance),
        ),
        "tip": "Label the principal, interest and ending balance. Convert both the rate to a decimal and the time to years before using the formula.",
        "checks": ("Is interest based on the starting deposit?", "Is the time in years for an annual rate?", "Does the question ask for interest, balance or principal?"),
    },
    {
        "key": "compound-interest", "title": "Work with annual compound interest",
        "summary": "Apply a fixed annual multiplier, separate interest from balance and compare simple and compound accounts.",
        "words": (("Compound interest","Interest based on the current balance, which includes earlier interest."),
                  ("Annual multiplier","The factor by which the balance changes in one year."), ("Annual compounding","Updating the balance and adding interest once per year."),
                  ("Exponent","The number of times the annual factor is multiplied by itself.")),
        "figure": "annual-balances",
        "sections": (
            ("grow-the-balance", "What changes when interest is compounded?", 8,
             "The balance at the end of year one includes the first interest payment. That new balance is the starting point for year two.",
             f"At a fixed annual rate {math('r')} written as a decimal, each year multiplies the current balance by {math('1+r')}. For a 4.2% rate the factor is {math('1.042')}.",
             "At 4%, a £650 deposit earns £26.00 in year one and grows to £676.00. The second year starts with £676.00 and earns £27.04.",
             "The multiplier needs the original 100% plus the added percentage. The rate alone gives one year's interest, not the updated balance.", compound_balance,compound_earned),
            ("apply-the-factor", "How do I find the balance or just the interest?", 9,
             "The same factor is applied once per full year when the rate and compounding period stay the same.",
             f"For principal {math('P')} and {math('n')} full years, the balance is {math('P(1+r)^n')}. To find interest only, take the original amount from the ending balance.",
             "Enter the multiplier in brackets with the exponent. Keep the full balance for the subtraction and round the amount requested at the end.",
             "The exponent is the number of annual updates. Multiplying the rate by the years gives a simple-interest calculation.", compound_earned,compound_balance),
            ("compare-accounts", "How do I compare two offers fairly?", 10,
             "The accounts can use different methods and may quote different rates. Compare balances for the same principal and term.",
             "Use the starting balance for every simple-interest calculation and the changing balance for the compound account. Use each account's own rate.",
             "Work out both balances before choosing the higher one. Subtract using the full values if the question asks for a difference.",
             "A compound account can finish lower if its rate is lower. Use the numbers given before deciding.", interest_difference,two_annual_rates),
        ),
        "tip": "Write down the annual multiplier and the exponent. Keep the full result until you have the required balance, interest or difference.",
        "checks": ("Have I used each account's own rate?", "Have I counted the full annual updates?", "Did I round the requested quantity at the end?"),
    },
)


def drawing(name, alt, boxes, connectors, caption):
    def node(x, y, label, colour):
        return (f'<rect x="{x}" y="{y}" width="112" height="36" rx="7" fill="{colour}" stroke="#56718e"/>'
                f'<text x="{x+56}" y="{y+23}" fill="#173554" text-anchor="middle" font-size="14">{escape(label)}</text>')
    body = "".join(node(*box) for box in boxes)
    if name == "exchange-directions":
        body += '<text x="190" y="47" fill="#173554" text-anchor="middle" font-size="13">Multiply</text><text x="190" y="91" fill="#173554" text-anchor="middle" font-size="13">Divide</text>'
    lines = "".join(f'<path d="{path}" fill="none" stroke="#355474" stroke-width="1.75"/>' for path in connectors)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 128" role="img" aria-label="{escape(alt,quote=True)}">'
           f'<rect width="380" height="128" rx="12" fill="#f8fafc"/><g font-family="Arial,sans-serif">{lines}{body}</g></svg>\n')
    folder = ROOT / "public/assets/study/0580/money"
    folder.mkdir(parents=True,exist_ok=True)
    (folder / f"{name}.svg").write_text(svg,encoding="utf-8")
    return dict(src=f"/assets/study/0580/money/{name}.svg",alt=alt,caption=p(caption),width=380,height=128)


def diagrams():
    first, middle, last = "#d8eaff", "#ccece5", "#fff0cc"
    return {
        "receipt-flow": drawing("receipt-flow", "An item subtotal and a fixed charge both flow into the total bill.",
            ((18,22,"Item subtotal",first),(18,75,"Fixed charge",middle),(249,48,"Total bill",last)),
            ("M130 40H176V66H248m-7 -4 7 4 -7 4","M130 93H176V66"),"Add the item subtotal and the single fixed charge."),
        "exchange-directions": drawing("exchange-directions", "Pounds and euros with a right-pointing arrow for multiplication and a left-pointing arrow for division, for a quote given in euros per pound.",
            ((19,47,"Pounds",first),(249,47,"Euros",middle)),("M131 57h118m-7 -4 7 4 -7 4","M249 72H131m7 -4 -7 4 7 4"),
            "With a quote of euros per pound, multiply pounds to get euros. Divide euros to get pounds."),
        "fixed-principal": drawing("fixed-principal", "The same initial deposit supplies the amount on which interest is calculated in each of two years.",
            ((19,47,"Starting deposit",first),(249,22,"Year 1 interest",middle),(249,75,"Year 2 interest",last)),
            ("M131 64h45V40h73m-7 -4 7 4 -7 4","M176 64v29h73m-7 -4 7 4 -7 4"),"Simple interest uses the same original deposit again in year two."),
        "annual-balances": drawing("annual-balances", "The starting balance flows to the year one balance. The year one balance then flows to the year two balance.",
            ((4,47,"Starting balance",first),(134,47,"Year 1 balance",middle),(264,47,"Year 2 balance",last)),
            ("M116 65h18m-7 -4 7 4 -7 4","M246 65h18m-7 -4 7 4 -7 4"),"Each new balance is used to calculate the next year's interest."),
    }


def check(uid, q):
    return dict(kind="check", id=uid, title=q["title"], prompt=q["prompt"], field=q["field"], hint=q["hint"], solution="".join(q["solution"]), retry=q["retry"])


def award(code, explanation):
    return dict(code=code, marks=1, description_html=explanation)


def short_task(uid, family, lesson, q, variant, level):
    return dict(id=uid, family_uid=family, lesson=lesson, title=q["title"], collection="variant" if variant else "short",
        difficulty=level, marks=1, prompt_html=q["prompt"], hint_html=q["hint"], answer_html=p(q["answer"]), solution_html="".join(q["solution"]),
        fields=[q["field"]], parts=[dict(label="a",marking_criteria=[award("B1",p(q["answer"]))])], verification=uid)


def written_task(uid, family, lesson, title, tasks, difficulty, variant, intro=""):
    prompts, solutions, answers, hints, parts = [], [], [], [], []
    for index, task in enumerate(tasks):
        label = chr(97+index)
        criteria = [award("M1",task["mark"]),award("A1",p(task["answer"]))]
        prompts.append(f'<li>{task["prompt"]}<span class="marks">[2]</span></li>')
        solutions.append(f'<h4>({label})</h4>'+"".join(task["solution"]))
        answers.append(p(f'({label}) {task["answer"]}'))
        hints.append(p(f"({label})")+task["hint"])
        parts.append(dict(label=label,marking_criteria=criteria))
    return dict(id=uid,family_uid=family,lesson=lesson,title=title,collection="exam",variant_index=variant,
        difficulty=difficulty,marks=2*len(parts),prompt_html=(p(intro) if intro else "")+'<ol class="parts" type="a">'+"".join(prompts)+"</ol>",
        answer_html="".join(answers),hint_html="".join(hints),solution_html="".join(solutions),fields=[],parts=parts,verification=uid)


def build_receipt(seed):
    quantity, price_each, courier = 4+seed%8, price(seed,440,3), price(seed,265,1)
    bill = quantity*price_each+courier
    cash = bill+price(seed,975,1)
    intro = f"A museum orders {quantity} folders at {pounds(cents(price_each))} each and pays one courier charge of {pounds(cents(courier))}."
    subtotal = quantity*price_each
    tasks = (
        amount("Make a bill", "Find the bill including the courier charge.", bill,
            [f"Multiply the price of one folder by {quantity}. The folders cost {pounds(cents(subtotal))}.", f"Add the courier charge once. The bill is {pounds(cents(bill))}."],
            "Multiply the unit price by the quantity and add the single courier charge.", "Find the full cost of the folders, then add the courier."),
        amount("Check the payment", f"The museum pays {pounds(cents(cash))} in cash. How much change is due?", cash-bill,
            [f"The cash payment is {pounds(cents(cash))}. Subtract the bill of {pounds(cents(bill))} to get {pounds(cents(cash-bill))}."],
            "Subtract the complete bill from the cash payment.", "The change is the part of the cash payment that is left after paying the bill."),
    )
    return intro, tasks


def build_visit(seed):
    gbp, rate = 90+seed, quoted_rate(seed)
    charge = 2+seed%4
    euro_total = (gbp-charge)*rate
    entry = price(seed,350,4)
    balance = (euro_total-entry)/rate
    intro = (f"A school team has £{gbp}. A bureau deducts {pounds(cents(charge))} once and converts the balance at £1 = {euros(cents(rate))}. "
             "There is no fee on the return conversion.")
    tasks = (
        amount("Convert the cash after the fee", "How many euros does the team receive?", euro_total,
            [f"The pounds remaining after the fee are {pounds(cents(gbp-charge))}.", f"Multiply by {rate_text(rate)}. The team receives {euros(cents(euro_total))}."],
            "Deduct the fee in pounds and multiply by euros per pound.", "Subtract the fee before exchanging.", currency="EUR"),
        amount("Convert the remaining balance", f"The team spends {euros(cents(entry))}. Find the value of the remaining amount in pounds, to the nearest penny, using the same rate.", balance,
            [f"Take {euros(cents(entry))} from the amount received in euros.", f"Divide the remainder by {rate_text(rate)}. This gives {pounds(cents(balance))} to the nearest penny."],
            "Subtract the purchase in euros, then divide the remaining euros by the quote.", "Do the subtraction in euros and then reverse the conversion."),
    )
    return intro, tasks


def build_term(seed):
    principal, percentage, years = interest_values(seed)
    annual=principal*percentage/100
    months=3+3*(seed%3)+12*years
    earned=annual*Fraction(months,12)
    intro=(f"A charity saves £{principal} at {rate_text(percentage)}% simple interest per year. Interest is proportional for part of a year.")
    tasks=(
        amount("Find the annual amount", "Find the interest for one year to the nearest penny.", annual,
            [f"Multiply £{principal} by the decimal rate {rate_text(percentage/100)}. The result rounds to {pounds(cents(annual))}."],
            "Multiply the principal by the annual rate as a decimal.", "Use the annual rate on the starting amount."),
        amount("Find the closing balance",f"The charity closes the account after {months} months. Find the ending balance to the nearest penny.",principal+earned,
            [f"The term is {rate_text(Fraction(months,12))} years. Multiply this by the full annual interest before rounding.",
             f"Add the principal. The ending balance is {pounds(cents(principal+earned))}."],
            "Multiply the full annual interest by months divided by 12 and add the principal.", "Convert to years and use the full annual interest."),
    )
    return intro,tasks


def build_two_accounts(seed):
    principal, percentage, years=interest_values(seed)
    annual=principal*percentage/100
    factor=1+percentage/100
    simple=principal+annual*years
    compound=principal*factor**years
    intro=(f"A club can keep £{principal} for {years} full years in either of two accounts. Both quote {rate_text(percentage)}% a year. "
           "Account A pays simple interest and Account B compounds annually.")
    tasks=(
        amount("Find the compound balance", "Calculate the ending balance in Account B to the nearest penny.", compound,
            [f"Build the annual multiplier {rate_text(factor)} and apply it {years} times to £{principal}.",f"The balance rounds to {pounds(cents(compound))}."],
            "Multiply the starting amount by the annual multiplier raised to the number of years.","Use the changing balance for interest in each year."),
        amount("Find the difference", "How much more would the club earn in interest with Account B than Account A? Give the answer to the nearest penny.", compound-simple,
            [f"Account A earns the same amount each year. Its balance rounds to {pounds(cents(simple))}.",
             f"The principal is the same in both accounts, so subtract the full balances before rounding. The extra interest is {pounds(cents(compound-simple))}."],
            "Calculate a simple balance and subtract it from the full compound balance.", "The difference in interest matches the difference in balances for the same starting amount."),
    )
    return intro,tasks


BANK = (
    ((total_cost, cash_change, account_balance, maximum_order, account_balance),
     (("Pay and check change", (total_cost,cash_change)), ("Track a cash pot", (account_balance,cash_change)),
      ("Plan a budget with a fixed fee", (maximum_order,total_cost)), ("Read a bill and decide what remains", (build_receipt,)),
      ("Check three money decisions", (account_balance,maximum_order,cash_change)))),
    ((to_euros, to_pounds, fixed_exchange_fee, compare_stores, from_euros_quote),
     (("Exchange in either direction", (to_euros,to_pounds)), ("Account for a fee and compare", (fixed_exchange_fee,compare_stores)),
      ("Choose a conversion direction", (to_pounds,from_euros_quote,compare_stores)), ("Convert, spend and return the balance", (build_visit,)),
      ("Compare and check a conversion with fees", (compare_stores,fixed_exchange_fee,to_pounds)))),
    ((simple_earned, simple_balance, partial_year, missing_principal, simple_balance),
     (("Separate interest from balance", (simple_earned,simple_balance)), ("Check a part-year deposit", (partial_year,simple_earned)),
      ("Use the annual rate and full term", (partial_year,missing_principal,simple_balance)), ("Track interest over a term in months", (build_term,)),
      ("Find the original deposit and verify interest", (missing_principal,partial_year,simple_earned)))),
    ((compound_balance, compound_earned, interest_difference, two_annual_rates, compound_earned),
     (("Distinguish balance and interest", (compound_balance,compound_earned)), ("Compare interest models", (interest_difference,compound_balance)),
      ("Compare rates on different accounts", (two_annual_rates,compound_earned)), ("Compare two accounts for the same deposit", (build_two_accounts,)),
      ("Check which calculation matches the account", (compound_earned,two_annual_rates,interest_difference)))),
)


def revision_sheet(lesson, graphic):
    sections = [f"<h2>{title}</h2>"+p(idea)+p(method) for _,title,_,_,idea,method,_,_,_ in lesson["sections"]]
    example = lesson["sections"][0][-2](17)
    worked = '<h2>Quick worked example</h2>'+example["prompt"]+"".join(example["solution"])
    figure = f'<p><img src="{graphic["src"]}" width="295" alt="{escape(graphic["alt"],quote=True)}"></p>'
    return dict(body="".join(sections)+worked+figure,
        checks='<ul>'+"".join(f'<li>{item}</li>' for item in lesson["checks"])+'</ul>', examTip=p(lesson["tip"]))


def build():
    figures = diagrams()
    study, lesson_meta, item_bank = {}, [], []
    desk = ('<table><caption>A small order</caption><thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Charge</th></tr></thead>'
            '<tbody><tr><th scope="row">Notebooks</th><td>3</td><td>£2.45 each</td></tr><tr><th scope="row">Collection</th><td>1</td><td>£1.80 once</td></tr></tbody></table>')
    balances = ('<table><caption>£650 at 4% a year, compounded annually</caption><thead><tr><th scope="col">Year</th><th scope="col">Start</th>'
                '<th scope="col">Interest</th><th scope="col">End</th></tr></thead><tbody><tr><th scope="row">1</th><td>£650.00</td><td>£26.00</td>'
                '<td>£676.00</td></tr><tr><th scope="row">2</th><td>£676.00</td><td>£27.04</td><td>£703.04</td></tr></tbody></table>')
    tables = {(0,0): desk, (3,0): balances}
    for index, lesson in enumerate(LESSONS):
        key = lesson["key"]
        uid = PREFIX+key
        graphic = figures[lesson["figure"]]
        examples, sections, more = [], [], []
        for order, (anchor, heading, minutes, intro, idea, method, mistake, first, second) in enumerate(lesson["sections"]):
            seed = 10+67*index+17*order
            offset = len(examples)
            for generated in (first(seed),second(seed+4)):
                examples.append(dict(title=generated["title"], question=generated["prompt"],solution=generated["solution"]))
            key_block = dict(kind="key",html=p(idea),**({"figure":graphic} if order==0 else {}))
            table = tables.get((index,order),"")
            blocks = [key_block,dict(kind="text",title="Practise the method",html=p(method)+table),
                dict(kind="example",index=offset),check(f"{uid}-{anchor}-a",first(seed+1)),
                dict(kind="mistake",html=p(mistake)),dict(kind="example",index=offset+1,tryFirst=True),
                check(f"{uid}-{anchor}-b",second(seed+5))]
            if order==2:
                blocks.append(dict(kind="tip",html=p(lesson["tip"])))
            sections.append(dict(id=anchor,title=heading,label=anchor.replace("-"," ").capitalize(),minutes=minutes,level="core",intro=p(intro),blocks=blocks))
            for j, generated in enumerate((first(seed+8),second(seed+11)),1):
                more.append(check(f"{uid}-{anchor}-extra-{j}",generated))
        prev = LESSONS[index-1] if index else None
        related = [dict(title=prev["title"],href=f'/courses/{COURSE}/topics/{PREFIX}{prev["key"]}')] if prev else []
        if key=="simple-interest":
            related.append(dict(title="Find a percentage of an amount",href=f"/courses/{COURSE}/topics/igcse-0580-percentages-amounts"))
        study[uid] = dict(updatedOn=DATE,description=lesson["summary"],sections=sections,examples=examples,extraPractice=more,related=related,
            glossary=[dict(term=term,definition=p(definition)) for term,definition in lesson["words"]],revision=revision_sheet(lesson,graphic))
        lesson_meta.append(dict(key=key,id=uid,title=lesson["title"],summary=lesson["summary"],objective=lesson["summary"],
            before=p("Write decimal prices clearly and check the unit beside each amount." if index<2 else "Write a percentage as a decimal before using the interest formulas."),
            ideas="".join(p(row[4]) for row in lesson["sections"]),method="".join(f"<h4>{row[1]}</h4>"+p(row[5]) for row in lesson["sections"]),
            mistakes=[row[6] for row in lesson["sections"]],examples=[dict(title=e["title"],question=e["question"],solution="".join(e["solution"]),
                verification=f"{uid}-worked-{i}") for i,e in enumerate(examples[::2],1)]))
        short, written = BANK[index]
        for j, generator in enumerate(short,1):
            family = f"M4U-0580-MNY-{key}-P{j}"
            for variant in range(2):
                task=generator(28+19*index+13*j+variant)
                item_bank.append(short_task(f"{family}-{variant}",family,key,task,bool(variant),min(3,1+(j-1)//2)))
        for j,(title,generators) in enumerate(written,1):
            family = f"M4U-0580-MNY-{key}-W{j}"
            for variant in range(4):
                seed=75+29*index+18*j+variant
                intro = ""
                if len(generators)==1:
                    intro,tasks = generators[0](seed)
                else:
                    tasks = [generator(seed+7*k) for k,generator in enumerate(generators)]
                item_bank.append(written_task(f"{family}-{variant}",family,key,title,tasks,min(4,j),variant,intro))
    manifest = dict(schema_version=1,key="0580-number-money",version="1.0.0",marking_status="DRAFT",
        course=dict(slug=COURSE,title="Cambridge IGCSE Mathematics (0580)",code="0580",direction="igcse"),
        chapter=dict(id="igcse_0580_money",slug="money",title="Money",position=15),
        source=dict(sha256=sha256(Path(__file__).read_bytes()).hexdigest(),supplied=0,held=[]),lessons=lesson_meta,questions=item_bank)
    folder=ROOT/"content/original/0580"
    for filename,data in (("money-v1.json",manifest),("money-study.json",study)):
        (folder/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(lesson_meta)} lessons, {sum(len(s['sections']) for s in study.values())} sections, {len(item_bank)} bank tasks, {len(figures)} diagrams")


if __name__=="__main__":
    build()

import datetime


dimanche_precedent = datetime.datetime.today() - datetime.timedelta(days=datetime.datetime.today().weekday())

# print milliseconds since epoch
print(int(dimanche_precedent.timestamp() * 1000))


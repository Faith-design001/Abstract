# Problem
A small business receives 30 orders through WhatsApp. Some get forgotten, some are delivered late, and some customers have not paid.

# Simple software solution
A small dashboard where the owner can see every order in one place.

# How it works

Customer sends an order → the owner adds it to the app.

for example: 
Ada has a customer, placed and order to buy 2 dresses for ₦40,000, on Friday morning.  this is unpaid 

The app puts it under New Orders, When the owner starts working on it:

The seller (owner) who sells the dress can then choose, the stage the product is ( New → Preparing → Ready → Delivered )

When the customer pays, 

the progress changes from Unpaid → Paid

The app can also send a reminder the owner:

“Ada's order is due tomorrow.”

# Technologies
HTML CSS JavaScript

# Current Features (MVP)

Dashboard: this is where the owner will see the today's order, unpaid orders, overdue orders, recent/order status overview and quickly add order that has not ben recorded. 

Order management: In this section you can add the customer order, customer name, order/ items, amount of the product, the due date, update the payment status, search orders, filter all both paid and unpaid orders, the owners can mover order from new to preparing to ready to delivered, you can edit / delete an order, mark order as paid.

Customer management: This is where you automatically create/associate customers from orders, create / view customer list, Search customers, view customer order history, total amount spent, view outstanding balance. 

Reports: it consists of the total sales, Paid amount, Unpaid amount, Number of orders, Orders by status, Sales/order chart,
Today / week / month / year filtering

Settings: the owner can edit the Business information, Owner/profile information, Currency, Basic order preferences, Data management/export

Navigation: Collapsible sidebar, Icons for every section, Icon-only collapsed state, Icon + label expanded state, Active page state, hover tooltips

Connected data: One order affects Dashboard, Orders, Customers, and Reports.
Changing payment or order status updates the whole product.

Deploying to Vercel Push this folder to a GitHub repository. Import the repository in Vercel. Vercel auto-detects, then click Deploy.

This is a bootcamp learning project.


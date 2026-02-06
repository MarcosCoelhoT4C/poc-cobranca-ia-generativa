const { v4: uuidv4 } = require('uuid');

class Portfolio {
  constructor({ administrator_id, portfolio_type, data_source, business_rules, customer_data }) {
    this.portfolio_id = `port_${uuidv4().slice(0, 12)}`;
    this.administrator_id = administrator_id;
    this.portfolio_type = portfolio_type || 'overdue_1_3_months';
    this.data_source = data_source || 'api_sync';
    this.business_rules = business_rules || {};
    this.customers_imported = customer_data?.length || 0;
    this.status = 'processing';
    this.created_at = new Date().toISOString();
    this.estimated_revenue = this._calculateEstimatedRevenue(customer_data);
  }

  _calculateEstimatedRevenue(customerData) {
    if (!customerData || customerData.length === 0) return 0;
    const totalOverdue = customerData.reduce((sum, c) => sum + (c.overdue_amount || 0), 0);
    // Estimated 35% recovery rate
    return Math.round(totalOverdue * 0.35 * 100) / 100;
  }

  toJSON() {
    return {
      portfolio_id: this.portfolio_id,
      administrator_id: this.administrator_id,
      portfolio_type: this.portfolio_type,
      data_source: this.data_source,
      business_rules: this.business_rules,
      customers_imported: this.customers_imported,
      status: this.status,
      estimated_revenue: this.estimated_revenue,
      created_at: this.created_at,
    };
  }
}

module.exports = Portfolio;

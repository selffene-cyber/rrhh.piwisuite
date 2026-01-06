export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          code: string | null
          name: string
          employer_name: string
          rut: string
          address: string | null
          city: string | null
          owner_id: string | null
          status: 'active' | 'inactive' | 'suspended'
          subscription_tier: 'basic' | 'pro' | 'enterprise'
          max_users: number | null
          max_employees: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string | null
          name: string
          employer_name: string
          rut: string
          address?: string | null
          city?: string | null
          owner_id?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          subscription_tier?: 'basic' | 'pro' | 'enterprise'
          max_users?: number | null
          max_employees?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string | null
          name?: string
          employer_name?: string
          rut?: string
          address?: string | null
          city?: string | null
          owner_id?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          subscription_tier?: 'basic' | 'pro' | 'enterprise'
          max_users?: number | null
          max_employees?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      company_users: {
        Row: {
          id: string
          user_id: string
          company_id: string
          role: 'owner' | 'admin' | 'user'
          status: 'active' | 'inactive' | 'pending'
          invited_by: string | null
          invited_at: string
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          role?: 'owner' | 'admin' | 'user'
          status?: 'active' | 'inactive' | 'pending'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          role?: 'owner' | 'admin' | 'user'
          status?: 'active' | 'inactive' | 'pending'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          company_id: string | null
          full_name: string
          rut: string
          birth_date: string | null
          address: string | null
          phone: string | null
          email: string | null
          hire_date: string
          position: string
          cost_center: string | null
          afp: string
          health_system: string
          health_plan: string | null
          health_plan_percentage: number | null
          base_salary: number
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          full_name: string
          rut: string
          birth_date?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          hire_date: string
          position: string
          cost_center?: string | null
          afp: string
          health_system: string
          health_plan?: string | null
          health_plan_percentage?: number | null
          base_salary: number
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          full_name?: string
          rut?: string
          birth_date?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          hire_date?: string
          position?: string
          cost_center?: string | null
          afp?: string
          health_system?: string
          health_plan?: string | null
          base_salary?: number
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      payroll_periods: {
        Row: {
          id: string
          company_id: string | null
          year: number
          month: number
          status: 'open' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          year: number
          month: number
          status?: 'open' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          year?: number
          month?: number
          status?: 'open' | 'closed'
          created_at?: string
          updated_at?: string
        }
      }
      payroll_slips: {
        Row: {
          id: string
          employee_id: string
          period_id: string
          days_worked: number
          days_leave: number
          base_salary: number
          taxable_base: number
          total_taxable_earnings: number
          total_non_taxable_earnings: number
          total_earnings: number
          total_legal_deductions: number
          total_other_deductions: number
          total_deductions: number
          net_pay: number
          status: 'draft' | 'issued' | 'sent'
          issued_at: string | null
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period_id: string
          days_worked?: number
          days_leave?: number
          base_salary: number
          taxable_base: number
          total_taxable_earnings?: number
          total_non_taxable_earnings?: number
          total_earnings?: number
          total_legal_deductions?: number
          total_other_deductions?: number
          total_deductions?: number
          net_pay?: number
          status?: 'draft' | 'issued' | 'sent'
          issued_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period_id?: string
          days_worked?: number
          days_leave?: number
          base_salary?: number
          taxable_base?: number
          total_taxable_earnings?: number
          total_non_taxable_earnings?: number
          total_earnings?: number
          total_legal_deductions?: number
          total_other_deductions?: number
          total_deductions?: number
          net_pay?: number
          status?: 'draft' | 'issued' | 'sent'
          issued_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payroll_items: {
        Row: {
          id: string
          payroll_slip_id: string
          type: 'taxable_earning' | 'non_taxable_earning' | 'legal_deduction' | 'other_deduction'
          category: string
          description: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          payroll_slip_id: string
          type: 'taxable_earning' | 'non_taxable_earning' | 'legal_deduction' | 'other_deduction'
          category: string
          description: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          payroll_slip_id?: string
          type?: 'taxable_earning' | 'non_taxable_earning' | 'legal_deduction' | 'other_deduction'
          category?: string
          description?: string
          amount?: number
          created_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          company_id: string
          name: string
          code: string | null
          status: 'active' | 'inactive'
          parent_department_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          code?: string | null
          status?: 'active' | 'inactive'
          parent_department_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          code?: string | null
          status?: 'active' | 'inactive'
          parent_department_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}


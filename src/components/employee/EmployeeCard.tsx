import { useNavigate } from 'react-router-dom';
import { Employee } from '@/types/hr';
import { Mail, Phone, MapPin } from 'lucide-react';

interface EmployeeCardProps {
  employee: Employee;
  clickable?: boolean;
}

export function EmployeeCard({ employee, clickable = true }: EmployeeCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (clickable) {
      navigate(`/employees/${employee.employeeId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`stat-card ${clickable ? 'cursor-pointer hover:border-primary/30' : ''}`}
    >
      <div className="flex items-center gap-4">
        <img
          src={employee.photoUrl}
          alt={employee.name}
          className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{employee.name}</h3>
          <p className="text-sm text-muted-foreground">{employee.department}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
            employee.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {employee.role === 'admin' ? 'Admin' : 'Employee'}
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span className="truncate">{employee.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          <span>{employee.phone}</span>
        </div>
      </div>
    </div>
  );
}

interface EmployeeRowProps {
  employee: Employee;
  onClick?: () => void;
}

export function EmployeeRow({ employee, onClick }: EmployeeRowProps) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <td className="table-cell">
        <div className="flex items-center gap-3">
          <img
            src={employee.photoUrl}
            alt={employee.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-medium">{employee.name}</p>
            <p className="text-xs text-muted-foreground">{employee.employeeId}</p>
          </div>
        </div>
      </td>
      <td className="table-cell">{employee.department}</td>
      <td className="table-cell">
        <span className={`text-xs px-2 py-1 rounded-full ${
          employee.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          {employee.role === 'admin' ? 'Admin' : 'Employee'}
        </span>
      </td>
      <td className="table-cell text-muted-foreground">{employee.email}</td>
      <td className="table-cell text-muted-foreground">{employee.phone}</td>
    </tr>
  );
}

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Users, CreditCard } from "lucide-react";

import useAuth from "@hooks/useAuth";

const Statistics = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: "Receita Total",
      value: "R$ 45.231,89",
      change: "+20.1%",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Despesas",
      value: "R$ 23.456,78",
      change: "-4.3%",
      icon: CreditCard,
      color: "text-red-600",
    },
    {
      title: "Clientes",
      value: "1.234",
      change: "+15.2%",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Crescimento",
      value: "12.5%",
      change: "+2.1%",
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">
                Bem-vindo de volta, {user?.name || 'Usuário'}!
              </h2>
              <p className="text-muted-foreground">
                Aqui está um resumo das suas finanças
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </h3>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stat.value}</div>
                <Badge variant={stat.change.startsWith('+') ? 'default' : 'secondary'}>
                  {stat.change} este mês
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Statistics;

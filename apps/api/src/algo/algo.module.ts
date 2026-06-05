import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AlgoGateway } from './algo.gateway';
import { AlgoService } from './algo.service';
import { MarketDataService } from './market-data.service';
import { SignalEngineService } from './signal-engine.service';
import { RiskEngineService } from './risk-engine.service';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  providers: [AlgoGateway, AlgoService, MarketDataService, SignalEngineService, RiskEngineService, TelemetryService],
  exports: [AlgoService, TelemetryService],
})
export class AlgoModule {}

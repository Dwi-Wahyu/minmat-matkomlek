import { db } from './db';
import {
	distribution,
	distributionEquipment,
	distributionConsumable,
	movement,
	approval,
	stock,
	equipment,
	warehouse,
	member
} from './db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { createNotification } from './notification';
import { createAuditLog } from './audit';

export interface CreateDistributionParams {
	fromOrganizationId: string;
	toOrganizationId: string;
	requestedBy: string;
	requesterRole: string;
	items: {
		type: 'EQUIPMENT' | 'CONSUMABLE';
		id: string; // equipmentId or itemId
		quantity: number;
		unit?: string;
		note?: string;
	}[];
}

/**
 * 1. CREATE DISTRIBUTION (REQUEST)
 */
export async function createDistribution(params: CreateDistributionParams) {
	return await db.transaction(async (tx) => {
		const distributionId = uuidv4();

		const isAutoValidated = [
			'operatorBinmatDanBekharrah',
			'operatorPusatDanDaerah',
			'superadmin'
		].includes(params.requesterRole);
		const initialStatus = isAutoValidated ? 'VALIDATED' : 'DRAFT';

		// Insert into distribution
		await tx.insert(distribution).values({
			id: distributionId,
			fromOrganizationId: params.fromOrganizationId,
			toOrganizationId: params.toOrganizationId,
			requestedBy: params.requestedBy,
			status: initialStatus,
			createdAt: new Date()
		});

		// Insert items based on type
		for (const itemData of params.items) {
			if (itemData.type === 'EQUIPMENT') {
				await tx.insert(distributionEquipment).values({
					id: uuidv4(),
					distributionId,
					equipmentId: itemData.id,
					note: itemData.note || null,
					createdAt: new Date()
				});
			} else {
				await tx.insert(distributionConsumable).values({
					id: uuidv4(),
					distributionId,
					itemId: itemData.id,
					quantity: String(itemData.quantity),
					unit: itemData.unit || null,
					note: itemData.note || null,
					createdAt: new Date()
				});
			}
		}

		// Audit Log
		await createAuditLog({
			userId: params.requestedBy,
			action: 'CREATE',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: initialStatus, itemsCount: params.items.length }
		});

		if (initialStatus === 'DRAFT') {
			// NOTIFIKASI: Ke Operator untuk Validasi
			const validators = await tx.query.member.findMany({
				where: and(
					eq(member.organizationId, params.fromOrganizationId),
					inArray(member.role, [
						'operatorBinmatDanBekharrah',
						'operatorPusatDanDaerah',
						'superadmin'
					])
				),
				columns: { userId: true },
				with: {
					organization: {
						columns: { slug: true }
					}
				}
			});

			for (const validator of validators) {
				if (validator.userId !== params.requestedBy) {
					await createNotification({
						userId: validator.userId!,
						title: 'Validasi Distribusi Diperlukan',
						body: `Terdapat pengajuan distribusi baru yang membutuhkan validasi Anda.`,
						priority: 'HIGH',
						action: {
							type: 'DISTRIBUTION_DETAIL',
							resourceId: distributionId,
							webPath: `/${validator.organization?.slug || 'pusat'}/distribusi/${distributionId}`
						}
					});
				}
			}
		} else {
			// NOTIFIKASI: Ke Pimpinan dan Kakomlek organisasi pengirim (Approval)
			const stakeholders = await tx.query.member.findMany({
				where: and(
					eq(member.organizationId, params.fromOrganizationId),
					inArray(member.role, ['pimpinan', 'kakomlek'])
				),
				columns: { userId: true },
				with: {
					organization: {
						columns: { slug: true }
					}
				}
			});

			for (const stake of stakeholders) {
				if (stake.userId !== params.requestedBy) {
					await createNotification({
						userId: stake.userId!,
						title: 'Verifikasi Distribusi Diperlukan',
						body: `Operator telah membuat pengajuan distribusi. Mohon verifikasi dan approve.`,
						priority: 'HIGH',
						action: {
							type: 'DISTRIBUTION_DETAIL',
							resourceId: distributionId,
							webPath: `/${stake.organization?.slug || 'pusat'}/distribusi/${distributionId}`
						}
					});
				}
			}
		}

		return distributionId;
	});
}

/**
 * 2. VALIDASI BINMAT (ADMIN CHECK)
 */
export async function validateDistribution(distributionId: string, userId: string) {
	return await db.transaction(async (tx) => {
		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId),
			with: {
				equipmentItems: true,
				consumableItems: true,
				fromOrganization: true
			}
		});

		if (!dist) throw new Error('Distribution not found');

		// 1. Validate Equipment
		for (const eqItem of dist.equipmentItems) {
			const eqp = await tx.query.equipment.findFirst({
				where: eq(equipment.id, eqItem.equipmentId)
			});
			if (!eqp) throw new Error(`Equipment ${eqItem.equipmentId} not found`);
			if (eqp.status !== 'READY') throw new Error(`Equipment ${eqp.serialNumber} is not READY`);
		}

		// 2. Validate Consumables
		if (dist.consumableItems.length > 0) {
			const warehousesInOrg = await tx.query.warehouse.findMany({
				where: eq(warehouse.organizationId, dist.fromOrganizationId as string),
				columns: { id: true }
			});
			const warehouseIds = warehousesInOrg.map((w) => w.id);

			if (warehouseIds.length === 0) {
				throw new Error('Organisasi pengirim tidak memiliki gudang');
			}

			for (const consItem of dist.consumableItems) {
				const totalStock = await tx
					.select({ total: sql<number>`sum(${stock.qty})` })
					.from(stock)
					.where(
						and(eq(stock.itemId, consItem.itemId), sql`${stock.warehouseId} IN ${warehouseIds}`)
					);

				const qty = Number(totalStock[0]?.total || 0);
				if (qty < Number(consItem.quantity)) {
					throw new Error(
						`Stok tidak mencukupi di kesatuan pengirim. Tersedia: ${qty}, Dibutuhkan: ${consItem.quantity}`
					);
				}
			}
		}

		// Update distribution status to VALIDATED
		await tx
			.update(distribution)
			.set({ status: 'VALIDATED' })
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: 'VALIDATE',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: 'VALIDATED' }
		});

		// NOTIFIKASI: Ke Pimpinan dan Kakomlek organisasi pengirim
		const stakeholders = await tx.query.member.findMany({
			where: and(
				eq(member.organizationId, dist.fromOrganizationId!),
				inArray(member.role, ['pimpinan', 'kakomlek'])
			),
			columns: { userId: true }
		});

		for (const stake of stakeholders) {
			await createNotification({
				userId: stake.userId!,
				title: 'Verifikasi Distribusi Diperlukan',
				body: `BINMAT telah memvalidasi permintaan distribusi. Mohon verifikasi dan approve.`,
				priority: 'HIGH',
				action: {
					type: 'DISTRIBUTION_DETAIL',
					resourceId: distributionId,
					webPath: `/${dist.fromOrganization?.slug}/distribusi/${distributionId}`
				}
			});
		}

		return { success: true };
	});
}

/**
 * 3. APPROVAL KOMANDO
 */
export async function approveDistribution(
	distributionId: string,
	userId: string,
	isApproved: boolean,
	note?: string
) {
	return await db.transaction(async (tx) => {
		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId),
			with: { fromOrganization: true }
		});

		if (!dist) throw new Error('Distribution not found');
		if (isApproved && dist.status !== 'VALIDATED') {
			throw new Error('Distribution must be VALIDATED before approval');
		}

		const status = isApproved ? 'APPROVED' : 'DRAFT';
		const approvalStatus = isApproved ? 'APPROVED' : 'REJECTED';

		// Insert into approval
		const approvalId = uuidv4();
		await tx.insert(approval).values({
			id: approvalId,
			referenceType: 'DISTRIBUTION',
			referenceId: distributionId,
			approvedBy: userId,
			status: approvalStatus,
			note,
			createdAt: new Date()
		});

		// Update distribution status
		await tx
			.update(distribution)
			.set({
				status: status,
				approvedBy: isApproved ? userId : null
			})
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: isApproved ? 'APPROVE' : 'REJECT',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status }
		});

		// Notification: To Requester
		if (isApproved && dist.requestedBy) {
			await createNotification({
				userId: dist.requestedBy,
				title: 'Distribusi Disetujui',
				body: `Permintaan distribusi telah disetujui oleh pimpinan.`,
				priority: 'HIGH',
				action: {
					type: 'DISTRIBUTION_DETAIL',
					resourceId: distributionId,
					webPath: `/${dist.fromOrganization?.slug}/distribusi/${distributionId}`
				}
			});
		}

		return { success: true, status };
	});
}

/**
 * 4. PREPARE & SHIPMENT (BEKHARRAH)
 */
export async function shipDistribution(
	distributionId: string,
	userId: string,
	consumableWarehouses?: Record<string, string>
) {
	return await db.transaction(async (tx) => {
		// 0. Update consumable items with selected warehouses if provided
		if (consumableWarehouses) {
			for (const [distConsId, warehouseId] of Object.entries(consumableWarehouses)) {
				await tx
					.update(distributionConsumable)
					.set({ fromWarehouseId: warehouseId })
					.where(eq(distributionConsumable.id, distConsId));
			}
		}

		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId),
			with: {
				equipmentItems: {
					with: {
						equipment: true
					}
				},
				consumableItems: true,
				toOrganization: true
			}
		});

		if (!dist) throw new Error('Distribution not found');
		if (dist.status !== 'APPROVED')
			throw new Error('Distribution must be APPROVED before shipping');

		// 1. Ship Equipment
		for (const eqItem of dist.equipmentItems) {
			const eqp = eqItem.equipment;
			if (!eqp) throw new Error(`Equipment ${eqItem.equipmentId} not found`);

			await tx.insert(movement).values({
				id: uuidv4(),
				equipmentId: eqItem.equipmentId,
				itemId: eqp.itemId,
				eventType: 'DISTRIBUTE_OUT',
				qty: '1.0000',
				fromWarehouseId: eqp.warehouseId,
				classification: 'TRANSITO',
				referenceType: 'DISTRIBUTION',
				referenceId: distributionId,
				organizationId: dist.fromOrganizationId,
				picId: userId,
				notes: eqItem.note,
				createdAt: new Date()
			});

			await tx
				.update(equipment)
				.set({ status: 'TRANSIT' })
				.where(eq(equipment.id, eqItem.equipmentId));
		}

		// 2. Ship Consumables
		for (const consItem of dist.consumableItems) {
			if (!consItem.fromWarehouseId) {
				throw new Error(`Gudang asal belum dipilih untuk item ${consItem.itemId}`);
			}

			const currentStock = await tx.query.stock.findFirst({
				where: and(
					eq(stock.itemId, consItem.itemId),
					eq(stock.warehouseId, consItem.fromWarehouseId)
				)
			});

			if (!currentStock || Number(currentStock.qty) < Number(consItem.quantity)) {
				throw new Error(
					`Stok tidak mencukupi untuk item ${consItem.itemId} di gudang yang dipilih`
				);
			}

			await tx
				.update(stock)
				.set({ qty: String(Number(currentStock.qty) - Number(consItem.quantity)) })
				.where(eq(stock.id, currentStock.id));

			await tx.insert(movement).values({
				id: uuidv4(),
				itemId: consItem.itemId,
				qty: String(consItem.quantity),
				unit: consItem.unit,
				eventType: 'DISTRIBUTE_OUT',
				fromWarehouseId: consItem.fromWarehouseId,
				classification: 'TRANSITO',
				referenceType: 'DISTRIBUTION',
				referenceId: distributionId,
				organizationId: dist.fromOrganizationId,
				picId: userId,
				notes: consItem.note,
				createdAt: new Date()
			});
		}

		// Update distribution status
		await tx
			.update(distribution)
			.set({ status: 'SHIPPED' })
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: 'SHIP',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: 'SHIPPED' }
		});

		// NOTIFIKASI: Ke Stakeholders TUJUAN
		const targetStakeholders = await tx.query.member.findMany({
			where: and(
				eq(member.organizationId, dist.toOrganizationId!),
				inArray(member.role, [
					'pimpinan',
					'kakomlek',
					'operatorPusatDanDaerah',
					'operatorBinmatDanBekharrah'
				])
			),
			columns: { userId: true, role: true }
		});

		for (const stake of targetStakeholders) {
			const isOperator =
				stake.role === 'operatorPusatDanDaerah' || stake.role === 'operatorBinmatDanBekharrah';

			await createNotification({
				userId: stake.userId!,
				title: 'Inventaris Dalam Pengiriman',
				body: isOperator
					? `Inventaris distribusi sedang dikirim ke satuan Anda. Mohon verifikasi apakah sudah sampai.`
					: `Inventaris dari distribusi sedang dikirim ke satuan Anda.`,
				priority: 'MEDIUM',
				action: {
					type: 'DISTRIBUTION_DETAIL',
					resourceId: distributionId,
					webPath: `/${dist.toOrganization?.slug}/distribusi/${distributionId}`
				}
			});
		}

		return { success: true };
	});
}

/**
 * 5. RECEIVING (SATUAN TUJUAN)
 */
export async function receiveDistribution(
	distributionId: string,
	userId: string,
	toWarehouseId: string
) {
	return await db.transaction(async (tx) => {
		const dist = await tx.query.distribution.findFirst({
			where: eq(distribution.id, distributionId),
			with: {
				equipmentItems: true,
				consumableItems: true,
				fromOrganization: true
			}
		});

		if (!dist) throw new Error('Distribution not found');
		if (dist.status !== 'SHIPPED') throw new Error('Distribution must be SHIPPED before receiving');

		// 1. Receive Equipment
		for (const eqItem of dist.equipmentItems) {
			const eqp = await tx.query.equipment.findFirst({
				where: eq(equipment.id, eqItem.equipmentId)
			});
			if (!eqp) throw new Error(`Equipment ${eqItem.equipmentId} not found`);

			await tx
				.update(equipment)
				.set({
					warehouseId: toWarehouseId,
					organizationId: dist.toOrganizationId,
					status: 'READY'
				})
				.where(eq(equipment.id, eqItem.equipmentId));

			await tx.insert(movement).values({
				id: uuidv4(),
				equipmentId: eqItem.equipmentId,
				itemId: eqp.itemId,
				eventType: 'DISTRIBUTE_IN',
				qty: '1.0000',
				toWarehouseId,
				classification: 'KOMUNITY',
				referenceType: 'DISTRIBUTION',
				referenceId: distributionId,
				organizationId: dist.toOrganizationId,
				picId: userId,
				notes: eqItem.note,
				createdAt: new Date()
			});
		}

		// 2. Receive Consumables
		for (const consItem of dist.consumableItems) {
			const existingStock = await tx.query.stock.findFirst({
				where: and(eq(stock.itemId, consItem.itemId), eq(stock.warehouseId, toWarehouseId))
			});

			if (existingStock) {
				await tx
					.update(stock)
					.set({ qty: String(Number(existingStock.qty) + Number(consItem.quantity)) })
					.where(eq(stock.id, existingStock.id));
			} else {
				await tx.insert(stock).values({
					id: uuidv4(),
					itemId: consItem.itemId,
					warehouseId: toWarehouseId,
					qty: String(consItem.quantity),
					updatedAt: new Date()
				});
			}

			await tx.insert(movement).values({
				id: uuidv4(),
				itemId: consItem.itemId,
				qty: String(consItem.quantity),
				unit: consItem.unit,
				eventType: 'DISTRIBUTE_IN',
				toWarehouseId,
				classification: 'KOMUNITY',
				referenceType: 'DISTRIBUTION',
				referenceId: distributionId,
				organizationId: dist.toOrganizationId,
				picId: userId,
				notes: consItem.note,
				createdAt: new Date()
			});
		}

		// Update distribution status
		await tx
			.update(distribution)
			.set({ status: 'RECEIVED' })
			.where(eq(distribution.id, distributionId));

		// Audit Log
		await createAuditLog({
			userId,
			action: 'RECEIVE',
			tableName: 'distribution',
			recordId: distributionId,
			newValue: { status: 'RECEIVED' }
		});

		// Notification: To Sender
		await createNotification({
			organizationId: dist.fromOrganizationId || undefined,
			title: 'Distribusi Diterima',
			body: `Materi dari distribusi telah diterima oleh satuan tujuan.`,
			priority: 'MEDIUM',
			action: {
				type: 'DISTRIBUTION_DETAIL',
				resourceId: distributionId,
				webPath: `/${dist.fromOrganization?.slug}/distribusi/${distributionId}`
			}
		});

		return { success: true };
	});
}
